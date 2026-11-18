"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
export function AdminApiRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} aria-busy={pending} onClick={() => start(() => router.refresh())} className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#c8d7e3] bg-white px-3 py-2 text-sm font-bold text-[#304d70] disabled:opacity-60">{pending ? "기록 확인 중…" : "기록 새로고침"}</button>;
}
