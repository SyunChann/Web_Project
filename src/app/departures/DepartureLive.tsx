"use client";

import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SplitFlapText } from "@/components/SplitFlapText";

const DepartureTime = createContext(0);
const RefreshPending = createContext(false);
const clockFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});

export function DepartureLive({ initialNow, children }: { initialNow: number; children: ReactNode }) {
  const [now, setNow] = useState(initialNow);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => {
    let lastRefresh = Date.now();
    let clockTimer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      if (document.hidden || Date.now() - lastRefresh < 120_000) return;
      lastRefresh = Date.now();
      startTransition(() => router.refresh());
    };
    const tick = () => {
      if (!document.hidden) setNow(Date.now());
      // Align with half-minute boundaries so the displayed minute changes on time.
      clockTimer = setTimeout(tick, 30_000 - Date.now() % 30_000);
    };
    const wake = () => {
      if (!document.hidden) { setNow(Date.now()); refresh(); }
    };
    clockTimer = setTimeout(tick, 30_000 - Date.now() % 30_000);
    const refreshTimer = setInterval(refresh, 120_000);
    document.addEventListener("visibilitychange", wake);
    return () => {
      clearTimeout(clockTimer);
      clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [router]);
  return <DepartureTime.Provider value={Math.max(initialNow, now)}>
    <RefreshPending.Provider value={pending}>{children}</RefreshPending.Provider>
  </DepartureTime.Provider>;
}

export function useDepartureTime() { return useContext(DepartureTime); }
export function useDepartureRefreshPending() { return useContext(RefreshPending); }

export function DepartureClock() {
  const now = useDepartureTime();
  return <SplitFlapText value={`${clockFormat.format(now)} KST`} delayMs={80} />;
}
