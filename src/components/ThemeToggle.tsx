"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const dark = mounted && resolvedTheme === "dark";
  return <button type="button" className="theme-toggle" aria-label="다크 모드" aria-pressed={mounted ? dark : undefined}
    title={mounted ? (dark ? "라이트 모드로 전환" : "다크 모드로 전환") : "테마 전환"}
    onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}>
    <Moon size={19} className="theme-toggle-moon" aria-hidden="true" />
    <Sun size={19} className="theme-toggle-sun" aria-hidden="true" />
  </button>;
}
