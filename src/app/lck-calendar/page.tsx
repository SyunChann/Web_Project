import { CalendarDays, Gamepad2, Radio } from "lucide-react";
import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { ContentSectionTabs } from "@/components/ContentSectionTabs";
import { LckMonthCalendar } from "@/components/lck/LckMonthCalendar";
import { lckMatches } from "@/data/lck";

export default function LckCalendarPage() {
  const regularSeason = lckMatches.filter((match) => match.stage.startsWith("Week")).length;
  const postseason = lckMatches.length - regularSeason;

  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="reviews" />
        <header className="py-10">
          <ContentSectionTabs active="lol" />
          <p className="flex items-center gap-2 text-sm font-black tracking-wide text-[#e32732]"><Radio size={16} /> LCK SCHEDULE</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#13233d] sm:text-5xl">LCK 경기 캘린더</h1>
              <p className="mt-3 max-w-2xl leading-7 text-[#52616b]">2026 LCK 일정입니다. 모든 경기 시간은 한국 표준시(KST) 기준으로 표시됩니다.</p>
            </div>
            <div className="flex gap-2 text-sm font-bold">
              <span className="rounded-full bg-[#fff0f0] px-3 py-2 text-[#c21d28]">정규 시즌 {regularSeason}경기</span>
              <span className="rounded-full bg-[#edf3ff] px-3 py-2 text-[#315c9f]">포스트시즌 {postseason}경기</span>
            </div>
          </div>
        </header>
        <LckMonthCalendar matches={lckMatches} />
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoCard icon={<CalendarDays size={18} />} title="일정 안내" text="경기 대진과 시작 시간은 공식 채널의 변경 사항에 따라 업데이트될 수 있습니다." />
          <InfoCard icon={<Gamepad2 size={18} />} title="시청 전 체크" text="대진을 누락하지 않도록 즐겨찾는 팀의 경기일을 미리 확인해 보세요." />
        </section>
      </section>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-[#dce4f0] bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-black text-[#13233d]"><span className="text-[#e32732]">{icon}</span>{title}</h2><p className="mt-2 text-sm leading-6 text-[#52616b]">{text}</p></div>;
}
