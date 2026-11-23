"use client";

import { useId, useState, type ReactNode } from "react";

export function MobileFilterDetails({ children, active = false, label = "필터·정렬" }: {
  children: ReactNode;
  active?: boolean;
  label?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <div className="mt-2 sm:mt-0">
    <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}
      className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--foreground)] sm:hidden">
      <span>{label}{active ? " · 적용 중" : ""}</span><span aria-hidden="true">{expanded ? "접기 −" : "펼치기 +"}</span>
    </button>
    <div id={id} className={expanded ? "block" : "hidden sm:block"}>{children}</div>
  </div>;
}
