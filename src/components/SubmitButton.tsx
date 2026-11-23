"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({ children, pendingLabel = "저장 중…", disabled, className }: {
  children: ReactNode; pendingLabel?: string; disabled?: boolean; className?: string;
}) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || disabled} aria-busy={pending} className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}>{pending ? pendingLabel : children}</button>;
}
