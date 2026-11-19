"use client";

import { useState } from "react";
import { apiServices, apiStateLabels, type ApiService } from "@/lib/apiMonitoringModel";
import { apiDayDuration, apiDayRate, incidentKind, summarizeApiDays, type ApiStatistics, type ApiDaySummary } from "@/lib/apiStatisticsModel";
import styles from "./AdminApiStatistics.module.css";

const timeFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const time = (value: string) => timeFormat.format(new Date(value));
const number = (value: number) => Math.round(value).toLocaleString("ko-KR");
const rate = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`;
const duration = (value: number | null) => value === null ? "—" : `${number(value)}ms`;

export function AdminApiStatistics({ data }: { data: ApiStatistics }) {
  const [service, setService] = useState<ApiService | "all">("all");
  const days = summarizeApiDays(data, service);
  const totals = days.reduce((sum, day) => ({ total: sum.total + day.total, success: sum.success + day.success, limited: sum.limited + day.limited, duration: sum.duration + day.duration }), { total: 0, success: 0, limited: 0, duration: 0 });
  const incidents = data.incidents.filter(event => service === "all" || event.service === service).slice(0, 50);
  const selectedName = service === "all" ? "전체 연동" : apiServices[service].name;
  return <section className={styles.panel} aria-labelledby="api-statistics-title">
    <header className={styles.heading}>
      <div><h2 id="api-statistics-title">최근 7일 운영 통계</h2><p>{time(data.window_start)} ~ {time(data.window_end)} · 한국 시간(KST)</p></div>
      <label className={styles.filter}>연동 선택<select value={service} onChange={event => setService(event.target.value as ApiService | "all")}>
        <option value="all">전체 연동</option>{(Object.keys(apiServices) as ApiService[]).map(id => <option key={id} value={id}>{apiServices[id].name}</option>)}
      </select></label>
    </header>
    <p className={styles.note}>통계 기능 적용 이후 저장된 관측 기록을 집계합니다. 같은 상태는 인스턴스별 1분 간격으로 기록하며, 실제 API 호출 횟수·가동률과 다릅니다.</p>
    {data.first_observation_at ? <p className={styles.note}>기간 내 첫 저장: {time(data.first_observation_at)} KST · 전체 연동 기준</p> : null}
    <div className={styles.metrics} aria-live="polite" aria-atomic="true">
      <Metric label="관측 성공률" value={rate(totals.total ? totals.success / totals.total * 100 : null)} hint="정상·결과 없음 / 전체 관측" />
      <Metric label="평균 조회 소요" value={duration(totals.total ? totals.duration / totals.total : null)} hint="캐시·응답 해석·재시도 포함" />
      <Metric label="호출 한도 관측" value={totals.total ? `${number(totals.limited)}건` : "—"} hint="한도 초과·HTTP 429 관측 기록" />
      <Metric label="저장된 관측" value={`${number(totals.total)}건`} hint={selectedName} />
    </div>
    {!totals.total ? <p className={styles.empty} role="status">선택한 연동의 관측 기록이 없습니다. 관련 서비스가 사용되면 기록이 쌓입니다. 기록이 없는 날은 성공률 0%나 장애로 처리하지 않습니다.</p> : null}
    <div className={styles.charts}>
      <DailyChart days={days} kind="rate" name={selectedName} />
      <DailyChart days={days} kind="duration" name={selectedName} />
    </div>
    <details className={styles.details}><summary>일별 수치 보기</summary><div className={styles.tableWrap}><table>
      <caption className={styles.srOnly}>{selectedName} 일별 관측 통계 · KST</caption>
      <thead><tr><th scope="col">날짜</th><th scope="col">관측</th><th scope="col">성공률</th><th scope="col">평균 소요</th><th scope="col">최대 소요</th><th scope="col">한도 초과</th></tr></thead>
      <tbody>{days.map(day => <tr key={day.day}><th scope="row">{day.day.slice(5)}</th><td>{number(day.total)}</td><td>{rate(apiDayRate(day))}</td><td>{duration(apiDayDuration(day))}</td><td>{day.total ? duration(day.max) : "—"}</td><td>{day.total ? number(day.limited) : "—"}</td></tr>)}</tbody>
    </table></div></details>
    <div className={styles.history}>
      <h3>문제·복구 관측 이력</h3>
      <p className={styles.note}>선택한 연동의 최근 상태 변경 최대 50건입니다. ‘정상 복귀’는 다음 조회에서 정상이 확인됐다는 뜻이며, 실제 장애 지속 시간을 의미하지 않습니다.</p>
      {incidents.length ? <ol>{incidents.map(event => <li key={`${event.service}:${event.checked_at}`}>
        <span className={`${styles.badge} ${event.state === "ok" || event.state === "empty" ? styles.recovered : styles.problem}`}>{incidentKind(event)}</span>
        <div><strong>{apiServices[event.service].name}</strong><p>{event.previous_state ? `${apiStateLabels[event.previous_state]} → ` : "이전 기록 없음 → "}{apiStateLabels[event.state]}{event.http_status ? ` · HTTP ${event.http_status}` : ""}</p></div>
        <time dateTime={event.checked_at}>{time(event.checked_at)}</time>
      </li>)}</ol> : <p className={styles.empty}>선택한 기간에 기록된 문제·복구 상태 변경이 없습니다.</p>}
    </div>
    <p className={styles.note}>상세 기록은 8일간 보관하며 새 기록을 저장할 때 만료 자료를 정리합니다. 조회가 없던 기간의 장애나 아직 저장되지 않은 결과는 통계에 포함되지 않습니다. URL·검색어·개인정보·응답 본문은 저장하지 않습니다.</p>
  </section>;
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className={styles.metric}><h3>{label}</h3><strong>{value}</strong><p>{hint}</p></div>;
}

function DailyChart({ days, kind, name }: { days: ApiDaySummary[]; kind: "rate" | "duration"; name: string }) {
  const values = days.map(day => kind === "rate" ? apiDayRate(day) : apiDayDuration(day));
  const max = kind === "rate" ? 100 : Math.max(100, Math.ceil(Math.max(...values.map(v => v ?? 0)) / 100) * 100);
  const y = (value: number) => 150 - value / max * 110;
  let path = "", connected = false;
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (value === null) { connected = false; continue; }
    path += `${connected ? " L" : " M"}${54 + index * 49} ${y(value)}`; connected = true;
  }
  const title = kind === "rate" ? "일별 관측 성공률" : "일별 평균 조회 소요";
  return <div className={styles.chart}><h3>{title}</h3><p>{kind === "rate" ? "일부 실패·갱신 지연은 성공에서 제외" : "캐시·해석·재시도를 포함한 처리 시간"}</p>
    <svg viewBox="0 0 370 200" role="img" aria-label={`${name} ${title}. 일별 수치는 아래 표에서 확인할 수 있습니다.`}>
      {[0, .5, 1].map(fraction => <g key={fraction}><line x1="49" y1={y(max * fraction)} x2="355" y2={y(max * fraction)} className={styles.gridLine} /><text x="43" y={y(max * fraction) + 4} textAnchor="end">{number(max * fraction)}{kind === "rate" ? "%" : ""}</text></g>)}
      <path d={path} className={styles.line} />
      {days.map((day, index) => <g key={day.day}><text x={54 + index * 49} y="180" textAnchor="middle">{day.day.slice(5).replace("-", "/")}</text>{values[index] !== null ? <circle cx={54 + index * 49} cy={y(values[index]!)} r="4" className={styles.point}><title>{`${day.day}: ${kind === "rate" ? rate(values[index]) : duration(values[index])} · 관측 ${day.total}건`}</title></circle> : <text x={54 + index * 49} y="150" textAnchor="middle">—</text>}</g>)}
    </svg>
  </div>;
}
