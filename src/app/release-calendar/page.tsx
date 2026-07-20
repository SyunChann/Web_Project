import { CalendarDays, Clock3, Sparkles } from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { ContentSectionTabs } from "@/components/ContentSectionTabs";
import { ReleaseMonthCalendar } from "@/components/watchlist/ReleaseMonthCalendar";
import { getWatchItems, type WatchItem } from "@/data/watchlist";
import { typeLabel } from "@/data/reviews";

function dateValue(item: WatchItem) {
  if (!item.releaseYear) return Number.POSITIVE_INFINITY;
  return new Date(item.releaseYear, (item.releaseMonth ?? 12) - 1, item.releaseDay ?? 31).getTime();
}

export default async function ReleaseCalendarPage() {
  const items = await getWatchItems();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const upcoming = items.filter((item) => item.releasePrecision !== "tba" && dateValue(item) >= new Date(year, month, now.getDate()).getTime()).sort((a, b) => dateValue(a) - dateValue(b)).slice(0, 6);
  const uncertain = items.filter((item) => item.releasePrecision !== "day").sort((a, b) => dateValue(a) - dateValue(b));

  return (
    <main className="min-h-screen px-4 py-5 sm:px-10 sm:py-8">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="watchlist" />
        <header className="py-10">
          <ContentSectionTabs active="calendar" />
          <p className="mt-6 flex items-center gap-2 text-sm font-bold text-[#2f7f7a]"><CalendarDays size={16} /> RELEASE CALENDAR</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#17202a] sm:text-4xl">기대작 릴리즈 캘린더</h1>
          <p className="mt-4 text-[#52616b]">공개일이 확정된 작품부터 연도만 정해진 기대작까지, 일정의 정확도에 맞춰 확인하세요.</p>
        </header>

        <ReleaseMonthCalendar items={items} />

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[#d7e7e4] bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-black"><Sparkles size={18} className="text-[#2f7f7a]" /> 다가오는 공개작</h2><div className="mt-4 grid gap-3">{upcoming.length ? upcoming.map((item) => <ReleaseItem key={item.id} item={item} />) : <Empty text="등록된 공개 일정이 없습니다." />}</div></div>
          <div className="rounded-xl border border-[#d7e7e4] bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-black"><Clock3 size={18} className="text-[#2f7f7a]" /> 날짜 미정·예정작</h2><div className="mt-4 grid gap-3">{uncertain.length ? uncertain.map((item) => <ReleaseItem key={item.id} item={item} />) : <Empty text="날짜가 미정인 기대작이 없습니다." />}</div></div>
        </section>
      </section>
    </main>
  );
}

function ReleaseItem({ item }: { item: WatchItem }) {
  const typeTheme = {
    movie: "bg-[#fff0ed] text-[#b84843]",
    anime: "bg-[#eef0ff] text-[#4657b8]",
    game: "bg-[#e7f6ed] text-[#247053]",
    drama: "bg-[#fff4df] text-[#9a5a13]",
  }[item.type];

  return <Link href={`/watchlist/${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#e7eeed] p-3 transition hover:border-[#8fc9c4] hover:bg-[#f7fcfb]"><div className="min-w-0"><p className="truncate font-bold text-[#17202a]">{item.title}</p><p className="mt-1 text-xs text-[#64748b]">{typeLabel(item.type)} · {item.releaseLabel}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${typeTheme}`}>{typeLabel(item.type)}</span></Link>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-[#c8dedb] px-4 py-8 text-center text-sm text-[#64748b]">{text}</p>;
}
