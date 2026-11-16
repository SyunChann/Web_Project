"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./DepartureBoard.module.css";
import { useDepartureTime } from "./DepartureLive";

type Destination = { code: string; name: string };

export function DepartureFilters({ destinations, header, children }: {
  destinations: Destination[];
  header: ReactNode;
  children: ReactNode[];
}) {
  const [selected, setSelected] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => Array.from(new Map(destinations.map((destination) => [destination.code, destination])).values())
    .sort((a, b) => a.name.localeCompare(b.name, "ko")), [destinations]);
  const activeSelection = options.some((option) => option.code === selected) ? selected : "";
  const visibleCount = destinations.filter((destination) => !activeSelection || destination.code === activeSelection).length;
  useEffect(() => {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-flight-row]") ?? []);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => rows.forEach((row) => {
      row.dataset.flipActive = String(row.dataset.flipVisible === "true" && !document.hidden && !motion.matches);
    });
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      for (const entry of entries) (entry.target as HTMLElement).dataset.flipVisible = String(entry.isIntersecting);
      update();
    });
    rows.forEach((row) => {
      row.dataset.flipVisible = String(!observer);
      observer?.observe(row);
    });
    update();
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", update);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", update);
      rows.forEach((row) => { row.dataset.flipActive = "false"; });
    };
  }, [children, activeSelection]);

  return (
    <>
      <div className={styles.filters}>
        <label className={styles.mobileFilter}>
          <span>목적지</span>
          <select value={activeSelection} onChange={(event) => setSelected(event.target.value)}>
            <option value="">전체 목적지 ({destinations.length}편)</option>
            {options.map((destination) => (
              <option key={destination.code} value={destination.code}>{destination.name} · {destination.code}</option>
            ))}
          </select>
        </label>
        <div className={styles.filterOptions} role="group" aria-label="목적지 필터">
          <button type="button" aria-pressed={!activeSelection} onClick={() => setSelected("")}>전체</button>
          {options.map((destination) => (
            <button key={destination.code} type="button" aria-pressed={activeSelection === destination.code}
              onClick={() => setSelected(destination.code)}>
              {destination.name} · {destination.code}
            </button>
          ))}
        </div>
        <p className={styles.filterSummary} role="status">전체 {destinations.length}편 중 {visibleCount}편 표시</p>
        <details className={styles.filterHelp}>
          <summary>시간 안내</summary>
          <p className={styles.countdownHint}>남은 시간은 변경 시각 우선 · 30초마다 계산 · 운항 상태는 마지막 데이터 갱신 기준</p>
        </details>
      </div>
      <div role="table" aria-label="출발편 목록">
        {header}
        <div role="rowgroup" ref={listRef}>
          {children.map((row, index) => !activeSelection || destinations[index].code === activeSelection
            ? <Fragment key={`${destinations[index].code}-${index}`}>{row}</Fragment> : null)}
        </div>
      </div>
    </>
  );
}

export function DepartureCountdown({ at, status }: { at?: string; status: string }) {
  const now = useDepartureTime();
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
