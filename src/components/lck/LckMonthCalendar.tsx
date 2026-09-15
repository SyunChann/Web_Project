"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month") - 1, day: value("day") };
}

export function LckMonthCalendar({ matches }: { matches: LckMatch[] }) {
  const router = useRouter();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = getKoreanToday();
    return new Date(today.year, today.month, 1);
  });

  useEffect(() => {
    const refreshSchedule = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const intervalId = window.setInterval(refreshSchedule, 60_000);
    document.addEventListener("visibilitychange", refreshSchedule);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshSchedule);
    };
  }, [router]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const today = getKoreanToday();
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthlyMatches = matches
    .filter((match) => {
      const date = parseDate(match.date);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .sort((left, right) =>
      `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`),
    );
  const matchesByDay = monthlyMatches.reduce<Record<number, LckMatch[]>>((grouped, match) => {
    const day = parseDate(match.date).getDate();
    (grouped[day] ??= []).push(match);
    return grouped;
  }, {});
  const scheduledDays = Object.keys(matchesByDay).map(Number).sort((left, right) => left - right);

  const moveMonth = (offset: number) =>
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  return (
    <section className="overflow-hidden rounded-2xl border border-[#273653] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce4f0] bg-[#f8faff] px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="이전 달"
            className="rounded-lg border border-[#cbd6e6] bg-white p-2 text-[#3b4d67] transition hover:border-[#e32732] hover:text-[#e32732]"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="min-w-28 text-center text-lg font-black tracking-tight text-[#13233d] sm:min-w-30 sm:text-xl">
            {year}년 {month + 1}월
          </h2>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="다음 달"
            className="rounded-lg border border-[#cbd6e6] bg-white p-2 text-[#3b4d67] transition hover:border-[#e32732] hover:text-[#e32732]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <a
          href="https://lolesports.com/ko-KR/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e32732] hover:underline sm:text-sm"
        >
          공식 일정 <ExternalLink size={15} />
        </a>
      </div>

      <div className="md:hidden">
        {scheduledDays.length > 0 ? (
          <ol className="divide-y divide-[#dce4f0]">
            {scheduledDays.map((day) => {
              const date = new Date(year, month, day);
              const isToday =
                today.year === year && today.month === month && today.day === day;
              return (
                <li key={day} className={isToday ? "bg-[#f0fdfa]" : "bg-white"}>
                  <div className="flex items-center gap-2 px-4 pb-2 pt-4">
                    <span
                      className={
                        isToday
                          ? "inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#0f766e] px-2 text-sm font-black text-white"
                          : "text-lg font-black text-[#13233d]"
                      }
                    >
                      {day}
                    </span>
                    <span className="text-sm font-bold text-[#64748b]">
                      {weekDays[date.getDay()]}요일
                    </span>
                    {isToday ? (
                      <span className="rounded-full bg-[#ccfbf1] px-2 py-1 text-[11px] font-black text-[#0f766e]">
                        오늘
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-2 px-4 pb-4">
                    {matchesByDay[day].map((match) => (
                      <MobileMatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="font-black text-[#3b4d67]">이달에 등록된 경기가 없습니다.</p>
            <p className="mt-2 text-sm text-[#718096]">
              공식 대진이 발표되면 자동으로 업데이트됩니다.
            </p>
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-l border-t border-[#dce4f0]">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={`border-b border-r border-[#dce4f0] bg-[#f3f6fa] py-2 text-center text-xs font-black ${
                index === 0 ? "text-[#e32732]" : index === 6 ? "text-[#2563b8]" : "text-[#52616b]"
              }`}
            >
              {day}
            </div>
          ))}
          {Array.from({ length: monthStart.getDay() }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="min-h-35 border-b border-r border-[#dce4f0] bg-[#fbfcfe]"
            />
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const scheduled = matchesByDay[day] ?? [];
            const weekday = (monthStart.getDay() + index) % 7;
            const isToday =
              today.year === year && today.month === month && today.day === day;
            const dayBackground = isToday
              ? "bg-[#f0fdfa] ring-1 ring-inset ring-[#99f6e4]"
              : weekday === 0
                ? "bg-[#fffafb]"
                : weekday === 6
                  ? "bg-[#f8fbff]"
                  : "";
            return (
              <div
                key={day}
                className={`min-h-35 border-b border-r border-[#dce4f0] p-2 ${dayBackground}`}
              >
                <p
                  className={`flex items-center gap-1 text-xs font-black ${
                    weekday === 0
                      ? "text-[#e32732]"
                      : weekday === 6
                        ? "text-[#2563b8]"
                        : "text-[#52616b]"
                  }`}
                >
                  <span
                    className={
                      isToday
                        ? "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0f766e] px-1 text-white"
                        : ""
                    }
                  >
                    {day}
                  </span>
                  {isToday ? <span className="font-black text-[#0f766e]">오늘</span> : null}
                </p>
                <div className="mt-1 space-y-1">
                  {scheduled.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MobileMatchCard({ match }: { match: LckMatch }) {
  const isWorlds = match.league === "Worlds";
  const tone = isWorlds
    ? "border-[#d8cafa] bg-[#f8f5ff]"
    : "border-[#f1bec0] bg-[#fff7f7]";

  return (
    <article className={`rounded-xl border p-3 shadow-sm ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <p
          className={`flex items-center gap-1.5 text-sm font-black ${
            isWorlds ? "text-[#6842b8]" : "text-[#e32732]"
          }`}
        >
          <Radio size={13} /> {match.time} KST
        </p>
        <MatchState state={match.state} />
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <TeamName code={match.home} align="right" />
        <span className="text-xs font-black text-[#8a95a1]">VS</span>
        <TeamName code={match.away} align="left" />
      </div>
      <p className="mt-3 border-t border-black/5 pt-2 text-xs font-semibold text-[#64748b]">
        {match.league} · {match.stage} · {match.format}
      </p>
    </article>
  );
}

function MatchCard({ match }: { match: LckMatch }) {
  const isTbd = match.home === "TBD" || match.away === "TBD";
  const isWorlds = match.league === "Worlds";
  const tone = isWorlds
    ? "border-[#d8cafa] bg-[#f8f5ff] text-[#241a3d]"
    : isTbd
      ? "border-[#d7deea] bg-[#f5f7fa] text-[#718096]"
      : "border-[#f1bec0] bg-[#fff5f5] text-[#17202a]";
  const accent = isWorlds ? "text-[#6842b8]" : "text-[#e32732]";

  return (
    <article className={`rounded-md border px-2 py-1.5 text-xs leading-tight shadow-sm ${tone}`}>
      <p className={`flex items-center gap-1 font-black ${accent}`}>
        <Radio size={10} /> {match.time}
        {match.state === "live" ? (
          <span className="ml-auto rounded bg-red-600 px-1 text-[9px] text-white">LIVE</span>
        ) : null}
      </p>
      <p className="mt-0.5 flex items-center gap-1 font-bold">
        <TeamMark code={match.home} />
        <span>{match.home}</span>
        <span className="mx-0.5 text-[#8a95a1]">vs</span>
        <TeamMark code={match.away} />
        <span>{match.away}</span>
      </p>
      <p className="pt-0.5 text-[10px] font-semibold text-[#718096]">
        {match.league} · {match.stage} · {match.format}
      </p>
    </article>
  );
}

function MatchState({ state }: { state: LckMatch["state"] }) {
  if (state === "live") {
    return (
      <span className="animate-pulse rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">
        LIVE
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-[#64748b]">
      {state === "completed" ? "종료" : "예정"}
    </span>
  );
}

function TeamName({ code, align }: { code: string; align: "left" | "right" }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        align === "right" ? "justify-end text-right" : "justify-start text-left"
      }`}
    >
      {align === "left" ? <TeamMark code={code} large /> : null}
      <span className="truncate text-sm font-black text-[#17202a]">{code}</span>
      {align === "right" ? <TeamMark code={code} large /> : null}
    </div>
  );
}

function TeamMark({ code, large = false }: { code: string; large?: boolean }) {
  const logoUrl = lckTeamLogoUrls[code];
  if (!logoUrl) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#1f2937] p-0.5 ring-1 ring-[#dce4f0] ${
        large ? "h-7 w-7" : "h-4 w-4"
      }`}
    >
      <img src={logoUrl} alt="" className="h-full w-full object-contain" />
    </span>
  );
}
