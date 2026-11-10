"use client";

import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from "react";
import styles from "./DepartureBoard.module.css";

const BoardTime = createContext(0);

type Destination = { code: string; name: string };

export function DepartureFilters({ destinations, initialNow, header, children }: {
  destinations: Destination[];
  initialNow: number;
  header: ReactNode;
  children: ReactNode[];
}) {
  const [selected, setSelected] = useState("");
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const update = () => {
      if (!document.hidden) setNow(Date.now());
    };
    const timer = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const options = Array.from(new Map(destinations.map((destination) => [destination.code, destination])).values())
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const visibleCount = destinations.filter((destination) => !selected || destination.code === selected).length;

  return (
    <BoardTime.Provider value={now}>
      <div className={styles.filters}>
        <div className={styles.filterOptions} role="group" aria-label="목적지 필터">
          <button type="button" aria-pressed={!selected} onClick={() => setSelected("")}>전체</button>
          {options.map((destination) => (
            <button key={destination.code} type="button" aria-pressed={selected === destination.code}
              onClick={() => setSelected(destination.code)}>
              {destination.name} · {destination.code}
            </button>
          ))}
        </div>
        <p className={styles.filterSummary} role="status">전체 {destinations.length}편 중 {visibleCount}편 표시</p>
        <p className={styles.countdownHint}>남은 시간은 변경 시각 우선 · 30초마다 계산 · 운항 상태는 마지막 데이터 갱신 기준</p>
      </div>
      <div role="table" aria-label="출발편 목록">
        {header}
        <div role="rowgroup">
          {children.map((row, index) => !selected || destinations[index].code === selected
            ? <Fragment key={index}>{row}</Fragment> : null)}
        </div>
      </div>
    </BoardTime.Provider>
  );
}

export function DepartureCountdown({ at, status }: { at?: string; status: string }) {
  const now = useContext(BoardTime);
  if (status === "canceled" || status === "departed") return null;
  const target = at ? Date.parse(at) : NaN;
  if (!Number.isFinite(target)) return null;
  const minutes = Math.ceil((target - now) / 60_000);
  if (minutes < 0) return <span className={styles.countdown}>출발 시각 경과</span>;
  const koreanDay = (value: number) => new Date(value + 9 * 3_600_000).toISOString().slice(0, 10);
  const tomorrow = koreanDay(target) !== koreanDay(now);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  const label = minutes === 0 ? "출발 예정 시각" : hours > 0
    ? `${hours}시간${remaining ? ` ${remaining}분` : ""} 후` : `${minutes}분 후`;
  return <span className={styles.countdown}>{tomorrow ? "내일 · " : ""}{label}</span>;
}
