"use client";

import { useState } from "react";
import type { AirportTerminal, CongestionResult } from "@/lib/incheonCongestion";
import { congestionDataState, congestionLaneLabel, congestionLevel, congestionOperatingState } from "@/lib/congestionPresentation";
import styles from "./DepartureCongestion.module.css";
import { useDepartureTime, useDepartureRefreshPending } from "./DepartureLive";

const observationFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

const messages: Record<Exclude<CongestionResult["state"], "ready">, string> = {
  empty: "현재 제공되는 출국장 정보가 없습니다. 미운영 또는 수집 지연일 수 있습니다.",
  "missing-key": "출국장 정보를 준비 중입니다. API 설정을 확인해 주세요.",
  authentication: "이 터미널의 API 인증 또는 활용 승인 상태를 확인해 주세요.",
  "rate-limit": "조회 한도에 도달했습니다. 잠시 후 다시 확인해 주세요.",
  unavailable: "출국장 정보 연결이 원활하지 않습니다. 잠시 후 다시 확인해 주세요.",
};

export function DepartureCongestion({ results }: { results: CongestionResult[] }) {
  const [selected, setSelected] = useState<AirportTerminal>("T1");
  const [expanded, setExpanded] = useState<string[]>([]);
  const pending = useDepartureRefreshPending();
  const currentTime = useDepartureTime();
  const result = results.find((entry) => entry.terminal === selected);
  const numbers = selected === "T1" ? [1, 2, 3, 4, 5, 6] : [1, 2];
  const lanes = selected === "T1" ? ["E", "W"] : ["A", "B", "C", "D"];

  return <section className={styles.panel} aria-labelledby="congestion-title" aria-busy={pending}>
    <div className={styles.heading}>
      <div><h2 id="congestion-title">출국장 대기 현황</h2><p>현재 출국장 정보 · 일본행 외 모든 국제선 이용객 공통</p></div>
      <span className={styles.refresh}>{pending ? "확인 중…" : "약 2분 간격 갱신"}</span>
    </div>
    <p className={styles.locationHint}>{selected === "T1" ? "출국장 1~6번 · 동편/서편 입구별 현황" : "출국장 1·2번 · 각 출국장의 A/B/C/D 입구별 현황"}</p>
    <div className={styles.terminals} role="group" aria-label="출국장 터미널 선택">
      {(["T1", "T2"] as const).map((terminal) => <button key={terminal} type="button" aria-pressed={selected === terminal} onClick={() => setSelected(terminal)}>
        {terminal} · 제{terminal === "T1" ? "1" : "2"}여객터미널
      </button>)}
    </div>
    {!result || result.state !== "ready" ? <p className={styles.message} role="status">{result ? messages[result.state as Exclude<CongestionResult["state"], "ready">] : "출국장 정보를 불러오지 못했습니다."}{result?.diagnostic ? ` (${result.diagnostic})` : ""}</p> : <ul className={`${styles.gates} ${selected === "T2" ? styles.t2 : ""}`}>
      {numbers.map((number) => {
        const key = `${selected}-${number}`;
        const open = expanded.includes(key);
        const detailsId = `congestion-${key}`;
        return <li key={number} className={styles.gate}>
        <div className={styles.gateHeading}><h3>{number}번 출국장</h3>
          <button type="button" className={styles.detailToggle} aria-expanded={open} aria-controls={detailsId}
            aria-label={`${number}번 출국장 상세 ${open ? "접기" : "보기"}`}
            onClick={() => setExpanded((keys) => open ? keys.filter((entry) => entry !== key) : [...keys, key])}>{open ? "접기 −" : "상세 +"}</button>
        </div>
        <div className={styles.compactLanes} data-expanded={open}>
          {lanes.map((lane) => {
            const gate = result.gates.find((entry) => entry.number === number && entry.lane === lane);
            const state = congestionDataState(gate, currentTime);
            const operating = congestionOperatingState(gate?.operatingTime, currentTime);
            const current = state === "fresh" && operating !== "outside";
            const message = operating === "outside" ? "운영시간 기준 미운영" : state === "missing" ? "미운영 또는 정보 없음" : state === "stale" ? "갱신 지연" : "수집 시각 확인 필요";
            return <p key={lane}><strong>{selected === "T1" ? lane === "E" ? "동편" : "서편" : lane}</strong><span>{current ? `${gate?.waitingPeople != null ? `${gate.waitingPeople.toLocaleString("ko-KR")}명` : "인원 미제공"} · ${gate?.waitMinutes != null ? `${gate.waitMinutes}분${gate.waitOver60 ? " 초과" : ""}` : "시간 미제공"}` : message}</span></p>;
          })}
        </div>
        <div id={detailsId} className={styles.laneDetails} data-expanded={open}>
        {lanes.map((lane) => {
          const gate = result.gates.find((entry) => entry.number === number && entry.lane === lane);
          const state = congestionDataState(gate, currentTime);
          const operating = congestionOperatingState(gate?.operatingTime, currentTime);
          const current = state === "fresh" && operating !== "outside";
          const level = current ? congestionLevel(gate?.waitMinutes ?? null) : null;
          return <div key={lane} className={`${styles.lane} ${operating === "outside" ? styles.closed : ""}`}>
            <span className={styles.laneName}>{congestionLaneLabel(selected, number, lane)}</span>
            <div className={styles.values}>
              {current ? <>
                <strong>{gate?.waitingPeople != null ? `${gate.waitingPeople.toLocaleString("ko-KR")}명` : "인원 미제공"}</strong>
                <span>{gate?.waitMinutes != null ? `예상 ${gate.waitMinutes}분${gate.waitOver60 ? " 초과" : ""}` : "시간 미제공"}</span>
                {level ? <span className={`${styles.level} ${styles[level.tone]}`}>{level.label}</span> : null}
              </> : <span className={styles.noData}>{operating === "outside" ? "운영시간 기준 미운영" : state === "missing" ? "미운영 또는 정보 없음" : state === "stale" ? "갱신 지연" : "수집 시각 확인 필요"}</span>}
            </div>
            {gate?.operatingTime ? <span className={styles.operating}>안내 운영시간 {gate.operatingTime}</span> : null}
            {gate?.observedAt && Number.isFinite(Date.parse(gate.observedAt)) ? <span className={styles.observed}>{state === "stale" ? "마지막 수집 " : "수집 "}{observationFormat.format(new Date(gate.observedAt))}</span> : null}
          </div>;
        })}
        </div>
      </li>; })}
    </ul>}
    <details className={styles.help}><summary>혼잡도·운영시간 안내</summary>
    <p className={styles.note}>혼잡 기준: 20분 미만 원활 · 20~40분 보통 · 40~60분 혼잡 · 60분 이상 매우혼잡. 예상 시간은 출국장 대기·보안검색·출국심사 시간을 포함합니다.</p>
    <p className={styles.note}>미운영 표시는 안내 운영시간과 현재 한국 시각을 비교한 결과이며 현장 운영과 다를 수 있습니다. 운영시간이 없는 입구는 판단하지 않습니다. 10분 초과 자료와 운영시간 밖의 대기 수치는 표시하지 않습니다.</p>
    </details>
    <p className={styles.source}>출처 인천국제공항공사 · 공공데이터포털</p>
  </section>;
}
