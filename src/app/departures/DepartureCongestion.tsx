"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AirportTerminal, CongestionResult } from "@/lib/incheonCongestion";
import styles from "./DepartureCongestion.module.css";

const messages: Record<Exclude<CongestionResult["state"], "ready">, string> = {
  empty: "현재 제공되는 출국장 정보가 없습니다.",
  "missing-key": "출국장 정보를 준비 중입니다. API 설정을 확인해 주세요.",
  authentication: "이 터미널의 API 인증 또는 활용 승인 상태를 확인해 주세요.",
  "rate-limit": "조회 한도에 도달했습니다. 잠시 후 다시 확인해 주세요.",
  unavailable: "출국장 정보 연결이 원활하지 않습니다. 잠시 후 다시 확인해 주세요.",
};

export function DepartureCongestion({ results, now }: { results: CongestionResult[]; now: number }) {
  const [selected, setSelected] = useState<AirportTerminal>("T1");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (!document.hidden) startTransition(() => router.refresh()); };
    const timer = window.setInterval(refresh, 120_000);
    return () => window.clearInterval(timer);
  }, [router]);
  const result = results.find((entry) => entry.terminal === selected);
  const numbers = selected === "T1" ? [1, 2, 3, 4, 5, 6] : [1, 2];
  const lanes = selected === "T1" ? ["E", "W"] : ["A", "B", "C", "D"];

  return <section className={styles.panel} aria-labelledby="congestion-title" aria-busy={pending}>
    <div className={styles.heading}>
      <div><h2 id="congestion-title">출국장 대기 현황</h2><p>현재 출국장 정보 · 일본행 외 모든 국제선 이용객 공통</p></div>
      <span className={styles.refresh}>{pending ? "확인 중…" : "약 2분 간격 갱신"}</span>
    </div>
    <div className={styles.terminals} role="group" aria-label="출국장 터미널 선택">
      {(["T1", "T2"] as const).map((terminal) => <button key={terminal} type="button" aria-pressed={selected === terminal} onClick={() => setSelected(terminal)}>
        {terminal} · 제{terminal === "T1" ? "1" : "2"}여객터미널
      </button>)}
    </div>
    {!result || result.state !== "ready" ? <p className={styles.message} role="status">{result ? messages[result.state as Exclude<CongestionResult["state"], "ready">] : "출국장 정보를 불러오지 못했습니다."}{result?.diagnostic ? ` (${result.diagnostic})` : ""}</p> : <ul className={`${styles.gates} ${selected === "T2" ? styles.t2 : ""}`}>
      {numbers.map((number) => <li key={number} className={styles.gate}>
        <h3>{number}번 출국장</h3>
        {lanes.map((lane) => {
          const gate = result.gates.find((entry) => entry.number === number && entry.lane === lane);
          const age = gate?.observedAt ? now - Date.parse(gate.observedAt) : null;
          const stale = age !== null && age > 10 * 60_000;
          return <div key={lane} className={styles.lane}>
            <span className={styles.laneName}>{lane === "E" ? "동편" : lane === "W" ? "서편" : `${lane}구역`}</span>
            <div className={styles.values}>
              <strong>{gate?.waitingPeople != null ? `${gate.waitingPeople.toLocaleString("ko-KR")}명` : "미제공"}</strong>
              <span>{gate?.waitMinutes != null ? `예상 ${gate.waitMinutes}분` : "시간 미제공"}</span>
            </div>
            <span className={styles.observed}>{gate?.observedAt ? `${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(gate.observedAt))}${stale ? " · 이전 자료" : " 기준"}` : "수집 시각 미제공"}</span>
          </div>;
        })}
      </li>)}
    </ul>}
    <p className={styles.note}>인원·예상 시간은 제공된 값이며 현장과 다를 수 있습니다. 0명·0분도 운영 중임을 보장하지 않습니다. 항공편 조회 날짜와 무관한 현재 현황입니다.</p>
    <p className={styles.source}>출처 인천국제공항공사 · 공공데이터포털</p>
  </section>;
}
