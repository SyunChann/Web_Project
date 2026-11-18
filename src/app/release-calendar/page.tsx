import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { ContentSectionTabs } from "@/components/ContentSectionTabs";
import { AniListQuarterCalendar } from "@/components/watchlist/AniListQuarterCalendar";
import { getAniListQuarterReleases, getCurrentAniListQuarter, type AniListQuarter } from "@/data/anilist";

export const metadata: Metadata = {
  title: "애니 신작 캘린더 | 취향보관소",
  description: "AniList에서 제공하는 분기별 애니메이션 신작 공개 일정을 확인하세요.",
};

type ReleaseCalendarPageProps = {
  searchParams?: Promise<{ year?: string | string[]; quarter?: string | string[] }>;
};
function readSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function parseQuarter(value: string | string[] | undefined) {
  const quarter = Number(readSearchValue(value));
  return Number.isInteger(quarter) && quarter >= 1 && quarter <= 4 ? quarter as AniListQuarter : getCurrentAniListQuarter();
}
function parseYear(value: string | string[] | undefined) {
  const year = Number(readSearchValue(value));
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : new Date().getFullYear();
}

export default async function ReleaseCalendarPage({ searchParams }: ReleaseCalendarPageProps) {
  const params = await searchParams;
  const selectedYear = parseYear(params?.year);
  const selectedQuarter = parseQuarter(params?.quarter);
  const items = await getAniListQuarterReleases(selectedYear, selectedQuarter);
  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="watchlist" />
        <header className="py-10">
          <ContentSectionTabs active="calendar" />
          <p className="mt-6 flex items-center gap-2 text-sm font-bold text-[#2f7f7a]"><CalendarDays size={16} /> ANIME RELEASE CALENDAR</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#17202a] sm:text-4xl">애니 신작 캘린더</h1>
          <p className="mt-4 text-[#52616b]">분기별 애니메이션 신작 공개 일정을 확인하세요. AniList 기준이며 국내 공개일과 다를 수 있습니다.</p>
        </header>
        <AniListQuarterCalendar year={selectedYear} quarter={selectedQuarter} items={items} />
      </section>
    </main>
  );
}
