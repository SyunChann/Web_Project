import { BarChart3, CalendarDays, Gamepad2, Globe2, Radio } from "lucide-react";
import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { ContentSectionTabs } from "@/components/ContentSectionTabs";
import { LckMonthCalendar } from "@/components/lck/LckMonthCalendar";
import type { EsportsSeasonEvent } from "@/data/lck";
import { getLolEsportsSchedule } from "@/lib/naverLckSchedule";

export const dynamic = "force-dynamic";

export default async function LckCalendarPage() {
  const { matches, seasonEvents, sourceAvailable } = await getLolEsportsSchedule();
  const lckMatches = matches.filter((match) => match.league === "LCK").length;
  const worldsMatches = matches.filter((match) => match.league === "Worlds").length;

  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="reviews" showAuth={false} />
        <header className="py-10">
          <ContentSectionTabs active="lol" />
          <p className="flex items-center gap-2 text-sm font-black tracking-wide text-[#e32732]"><Radio size={16} /> LCK SCHEDULE</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#13233d] sm:text-5xl">LCK 경기 캘린더</h1>
              <p className="mt-3 max-w-2xl leading-7 text-[#52616b]">LoL Esports 공식 일정에서 LCK 플레이인·플레이오프와 월드 챔피언십 일정을 자동으로 불러옵니다. 모든 경기 시간은 한국 표준시(KST) 기준입니다.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <a href="/lck-analysis" className="inline-flex items-center gap-1.5 rounded-full border border-[#efb3b7] bg-[#fff5f5] px-3 py-2 text-[#a81420] shadow-sm transition hover:border-[#e32732] hover:bg-[#ffe8e9]"><BarChart3 size={15} strokeWidth={2.5} className="text-[#c21d28]" /> 밴픽 분석</a>
              <span className="rounded-full bg-[#fff0f0] px-3 py-2 text-[#c21d28]">LCK {lckMatches}경기</span>
              <span className="rounded-full bg-[#f2edff] px-3 py-2 text-[#6842b8]">Worlds {worldsMatches}경기</span>
            </div>
          </div>
        </header>
        {seasonEvents.length > 0 ? <TournamentPeriods events={seasonEvents} /> : null}
        {!sourceAvailable ? <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">공식 일정에 일시적으로 연결할 수 없습니다. 잠시 후 자동으로 다시 확인합니다.</p> : null}
        <LckMonthCalendar matches={matches} />
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoCard icon={<CalendarDays size={18} />} title="일정 안내" text="경기 대진과 시작 시간은 공식 채널의 변경 사항에 따라 업데이트될 수 있습니다." />
          <InfoCard icon={<Gamepad2 size={18} />} title="시청 전 체크" text="대진을 누락하지 않도록 즐겨찾는 팀의 경기일을 미리 확인해 보세요." />
        </section>
      </section>
    </main>
  );
}

function TournamentPeriods({ events }: { events: EsportsSeasonEvent[] }) {
  return <section className="mb-5 grid gap-3 sm:grid-cols-2">{events.map((event) => <article key={event.id} className="flex items-center gap-4 rounded-xl border border-[#d8cafa] bg-gradient-to-r from-[#f8f5ff] to-white p-4 shadow-sm"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6842b8] text-white"><Globe2 size={20} /></span><div><p className="text-xs font-black uppercase tracking-wide text-[#7657bb]">{event.category}</p><h2 className="font-black text-[#241a3d]">{event.title}</h2><p className="mt-0.5 text-sm font-bold text-[#625875]">{formatDate(event.startDate)} ~ {formatDate(event.endDate)}</p></div></article>)}</section>;
}

function formatDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-[#dce4f0] bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-black text-[#13233d]"><span className="text-[#e32732]">{icon}</span>{title}</h2><p className="mt-2 text-sm leading-6 text-[#52616b]">{text}</p></div>;
}
