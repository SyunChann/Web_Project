"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Radio } from "lucide-react";
import { useState } from "react";
import { lckTeamLogoUrls, type LckMatch } from "@/data/lck";

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getKoreanToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts();
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month") - 1, day: value("day") };
}

export function LckMonthCalendar({ matches }: { matches: LckMatch[] }) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(2026, 7, 1));
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const today = getKoreanToday();
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const matchesByDay = matches.filter((match) => {
    const date = parseDate(match.date);
    return date.getFullYear() === year && date.getMonth() === month;
  }).reduce<Record<number, LckMatch[]>>((grouped, match) => {
    const day = parseDate(match.date).getDate();
    (grouped[day] ??= []).push(match);
    return grouped;
  }, {});

  const moveMonth = (offset: number) => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  return <section className="overflow-hidden rounded-2xl border border-[#273653] bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dce4f0] bg-[#f8faff] px-4 py-4 sm:px-6">
      <div className="flex items-center gap-2"><button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달" className="rounded-lg border border-[#cbd6e6] bg-white p-2 text-[#3b4d67] transition hover:border-[#e32732] hover:text-[#e32732]"><ChevronLeft size={18} /></button><h2 className="min-w-30 text-center text-xl font-black tracking-tight text-[#13233d]">{year}년 {month + 1}월</h2><button type="button" onClick={() => moveMonth(1)} aria-label="다음 달" className="rounded-lg border border-[#cbd6e6] bg-white p-2 text-[#3b4d67] transition hover:border-[#e32732] hover:text-[#e32732]"><ChevronRight size={18} /></button></div>
      <a href="https://lolesports.com/ko-KR/leagues/lck" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#e32732] hover:underline">공식 일정 보기 <ExternalLink size={15} /></a>
    </div>
    <div className="grid grid-cols-7 border-l border-t border-[#dce4f0]">
      {weekDays.map((day, index) => <div key={day} className={`border-b border-r border-[#dce4f0] bg-[#f3f6fa] py-2 text-center text-xs font-black ${index === 0 ? "text-[#e32732]" : index === 6 ? "text-[#2563b8]" : "text-[#52616b]"}`}>{day}</div>)}
      {Array.from({ length: monthStart.getDay() }).map((_, index) => <div key={`empty-${index}`} className="min-h-27 border-b border-r border-[#dce4f0] bg-[#fbfcfe] sm:min-h-35" />)}
      {Array.from({ length: daysInMonth }).map((_, index) => { const day = index + 1; const scheduled = matchesByDay[day] ?? []; const weekday = (monthStart.getDay() + index) % 7; const isToday = today.year === year && today.month === month && today.day === day; const dayBackground = isToday ? "bg-[#f0fdfa] ring-1 ring-inset ring-[#99f6e4]" : weekday === 0 ? "bg-[#fffafb]" : weekday === 6 ? "bg-[#f8fbff]" : ""; return <div key={day} className={`min-h-27 border-b border-r border-[#dce4f0] p-1.5 sm:min-h-35 sm:p-2 ${dayBackground}`}><p className={`flex items-center gap-1 text-xs font-black ${weekday === 0 ? "text-[#e32732]" : weekday === 6 ? "text-[#2563b8]" : "text-[#52616b]"}`}><span className={isToday ? "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0f766e] px-1 text-white" : ""}>{day}</span>{isToday ? <span className="font-black text-[#0f766e]">오늘</span> : null}</p><div className="mt-1 space-y-1">{scheduled.map((match) => <MatchCard key={match.id} match={match} />)}</div></div>; })}
    </div>
  </section>;
}

function MatchCard({ match }: { match: LckMatch }) {
  const isTbd = match.home === "TBD";
  return <article className={`rounded-md border px-1.5 py-1 text-[10px] leading-tight shadow-sm sm:px-2 sm:py-1.5 sm:text-xs ${isTbd ? "border-[#d7deea] bg-[#f5f7fa] text-[#718096]" : "border-[#f1bec0] bg-[#fff5f5] text-[#17202a]"}`}><p className="flex items-center gap-1 font-black text-[#e32732]"><Radio size={10} /> {match.time}</p><p className="mt-0.5 flex items-center gap-1 font-bold"><TeamMark code={match.home} /><span>{match.home}</span><span className="mx-0.5 text-[#8a95a1]">vs</span><TeamMark code={match.away} /><span>{match.away}</span></p><p className="hidden pt-0.5 text-[10px] font-semibold text-[#718096] sm:block">{match.stage} · {match.format}</p></article>;
}

function TeamMark({ code }: { code: string }) {
  const logoUrl = lckTeamLogoUrls[code];
  if (!logoUrl) return null;

  return <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1f2937] p-0.5 ring-1 ring-[#dce4f0]"><img src={logoUrl} alt="" className="h-full w-full object-contain" /></span>;
}
