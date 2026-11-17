"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SplitFlapText } from "@/components/SplitFlapText";
import styles from "./DepartureRefresh.module.css";

const DepartureTime = createContext(0);
const RefreshPending = createContext(false);
const RefreshControl = createContext({ refresh: () => {}, nextAt: 0, checkedAt: 0 });
const clockFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});

export function DepartureLive({ initialNow, children }: { initialNow: number; children: ReactNode }) {
  const [now, setNow] = useState(initialNow);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const lastRefresh = useRef(initialNow);
  const busy = useRef(false);
  const [nextAt, setNextAt] = useState(initialNow + 120_000);
  useEffect(() => { busy.current = pending; }, [pending]);
  const refresh = useCallback(() => {
    const current = Date.now();
    if (document.hidden || !navigator.onLine || busy.current || current - lastRefresh.current < 15_000) return;
    lastRefresh.current = current;
    setNextAt(current + 120_000);
    startTransition(() => router.refresh());
  }, [router]);
  useEffect(() => {
    let clockTimer: ReturnType<typeof setTimeout>;
    const autoRefresh = () => { if (Date.now() - lastRefresh.current >= 120_000) refresh(); };
    const tick = () => {
      if (!document.hidden) setNow(Date.now());
      // Align with half-minute boundaries so the displayed minute changes on time.
      clockTimer = setTimeout(tick, 30_000 - Date.now() % 30_000);
    };
    const wake = () => {
      if (!document.hidden) { setNow(Date.now()); autoRefresh(); }
    };
    clockTimer = setTimeout(tick, 30_000 - Date.now() % 30_000);
    const refreshTimer = setInterval(autoRefresh, 1000);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      clearTimeout(clockTimer);
      clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [refresh]);
  return <DepartureTime.Provider value={Math.max(initialNow, now)}>
    <RefreshPending.Provider value={pending}><RefreshControl.Provider value={{ refresh, nextAt, checkedAt: initialNow }}>{children}</RefreshControl.Provider></RefreshPending.Provider>
  </DepartureTime.Provider>;
}

export function useDepartureTime() { return useContext(DepartureTime); }
export function useDepartureRefreshPending() { return useContext(RefreshPending); }

export function DepartureClock() {
  const now = useDepartureTime();
  return <SplitFlapText value={`${clockFormat.format(now)} KST`} delayMs={80} />;
}

export function DepartureRefresh() {
  const { refresh, nextAt, checkedAt } = useContext(RefreshControl);
  const pending = useDepartureRefreshPending();
  const [time, setTime] = useState(checkedAt);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const tick = () => { if (!document.hidden) { setTime(Date.now()); setOnline(navigator.onLine); } };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((nextAt - time) / 1000));
  const cooldown = Math.max(0, Math.ceil((nextAt - 105_000 - time) / 1000));
  return <div className={styles.panel}>
    <div><p>화면 확인 <time dateTime={new Date(checkedAt).toISOString()}>{clockFormat.format(checkedAt)} KST</time></p>
      <p className={styles.hint} role={!online || pending ? "status" : undefined}>{!online ? "인터넷 연결 후 자동으로 다시 확인합니다." : pending ? "최신 제공 정보를 확인하고 있습니다…" : `자동 확인 ${Math.floor(seconds / 60)}분 ${String(seconds % 60).padStart(2, "0")}초 후`}</p>
    </div>
    <button type="button" onClick={refresh} disabled={pending || !online || cooldown > 0}>{pending ? "확인 중…" : cooldown > 0 ? `${cooldown}초 후 재확인` : "다시 확인"}</button>
    <details className={styles.note}><summary>갱신 시각 안내</summary><p>화면은 2분마다 확인합니다. 아래 수집·갱신 시각이 실제 자료의 기준이며, 항공편 자료는 최대 5분간 캐시됩니다. 갱신 지연은 제공기관의 수집 자료가 10분 넘게 지난 상태입니다.</p></details>
  </div>;
}
