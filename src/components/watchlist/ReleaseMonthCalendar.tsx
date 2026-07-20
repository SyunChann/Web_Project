"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { WatchItem } from "@/data/watchlist";

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

export function ReleaseMonthCalendar({ items }: { items: WatchItem[] }) {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const scheduledItems = items.filter((item) => item.releasePrecision === "day" && item.releaseYear === year && item.releaseMonth === month + 1);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const calendarTypeTheme = {
    movie: "bg-[#fff0ed] text-[#b84843] hover:bg-[#ffdeda]",
    anime: "bg-[#eef0ff] text-[#4657b8] hover:bg-[#dfe4ff]",
    game: "bg-[#e7f6ed] text-[#247053] hover:bg-[#d5efe3]",
    drama: "bg-[#fff4df] text-[#9a5a13] hover:bg-[#fbe8c5]",
  };

  const moveMonth = (offset: number) => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  return (
    <section className="rounded-xl border border-[#d7e7e4] bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => moveMonth(-1)} className="rounded-md border border-[#c8dedb] p-2 text-[#52616b] hover:border-[#38a39b] hover:text-[#2f7f7a]" aria-label="이전 달"><ChevronLeft size={18} /></button>
          <h2 className="min-w-28 text-center text-xl font-black text-[#17202a]">{year}년 {month + 1}월</h2>
          <button type="button" onClick={() => moveMonth(1)} className="rounded-md border border-[#c8dedb] p-2 text-[#52616b] hover:border-[#38a39b] hover:text-[#2f7f7a]" aria-label="다음 달"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-t border-l border-[#e7eeed]">
        {weekDays.map((day, index) => <div key={day} className={`border-r border-b border-[#e7eeed] bg-[#f7fcfb] py-2 text-center text-xs font-black ${index === 0 ? "text-[#be4b49]" : index === 6 ? "text-[#2563eb]" : "text-[#52616b]"}`}>{day}</div>)}
        {Array.from({ length: monthStart.getDay() }).map((_, index) => <div key={`blank-${index}`} className="min-h-24 border-r border-b border-[#e7eeed] bg-[#fbfcfc]" />)}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const scheduled = scheduledItems.filter((item) => item.releaseDay === day);
          const isToday = isCurrentMonth && day === today.getDate();
          const weekDay = (monthStart.getDay() + index) % 7;
          const dateColor = weekDay === 0 ? "text-[#be4b49]" : weekDay === 6 ? "text-[#2563eb]" : isToday ? "text-[#2f7f7a]" : "text-[#52616b]";
          return <div key={day} className="min-h-24 border-r border-b border-[#e7eeed] p-2"><p className={`text-xs font-bold ${dateColor}`}>{day}</p>{scheduled.map((item) => <Link key={item.id} href={`/watchlist/${item.id}`} className={`group relative mt-1 block rounded px-1.5 py-1 text-[11px] font-bold ${calendarTypeTheme[item.type]}`}><span className="block truncate">{item.title}</span><span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-36 overflow-hidden rounded-lg border border-[#d8cfc2] bg-white text-left shadow-lg group-hover:block group-focus-visible:block"><span className="flex h-48 items-center justify-center bg-[#f7f4ef]"><img src={item.thumbnail} alt="" className="h-full w-full object-contain" /></span><span className="block truncate px-2 py-1.5 text-xs font-bold text-[#17202a]">{item.title}</span></span></Link>)}</div>;
        })}
      </div>
    </section>
  );
}
