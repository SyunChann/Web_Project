"use client";

import { ExternalLink, Film } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { AniListAnimeRelease, AniListQuarter } from "@/data/anilist";

type AniListQuarterCalendarProps = {
  year: number;
  quarter: AniListQuarter;
  items: AniListAnimeRelease[];
};

export function AniListQuarterCalendar({
  year: initialYear,
  quarter: initialQuarter,
  items: initialItems,
}: AniListQuarterCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [quarter, setQuarter] = useState(initialQuarter);
  const [items, setItems] = useState(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function moveQuarter(offset: -1 | 1) {
    const nextQuarter = quarter + offset;
    const targetQuarter = (nextQuarter === 0 ? 4 : nextQuarter === 5 ? 1 : nextQuarter) as AniListQuarter;
    const targetYear = nextQuarter === 0 ? year - 1 : nextQuarter === 5 ? year + 1 : year;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/anilist/releases?year=${targetYear}&quarter=${targetQuarter}`);
      const payload = (await response.json()) as { items?: AniListAnimeRelease[] };

      if (!response.ok || !Array.isArray(payload.items)) {
        throw new Error("AniList releases could not be loaded.");
      }

      setYear(targetYear);
      setQuarter(targetQuarter);
      setItems(payload.items);
      window.history.replaceState(null, "", `/release-calendar?year=${targetYear}&quarter=${targetQuarter}`);
    } catch {
      setErrorMessage("공개 예정작을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-[#d7e7e4] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#4657b8]">
            <Film size={16} />
            ANILIST RELEASES
          </p>
          <h2 className="mt-2 text-xl font-black text-[#17202a]">
            {year}년 {quarter}분기 애니 신작
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">
            해당 시즌에 시작하는 작품을 한곳에서 확인합니다. 실제 국내 공개일과 다를 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveQuarter(-1)}
            disabled={isLoading}
            className="rounded-md border border-[#c8dedb] bg-white px-3 py-2 text-sm font-bold text-[#52616b] transition hover:border-[#4657b8] hover:text-[#4657b8]"
          >
            이전 분기
          </button>
          <button
            type="button"
            onClick={() => moveQuarter(1)}
            disabled={isLoading}
            className="rounded-md border border-[#c8dedb] bg-white px-3 py-2 text-sm font-bold text-[#52616b] transition hover:border-[#4657b8] hover:text-[#4657b8]"
          >
            {isLoading ? "불러오는 중" : "다음 분기"}
          </button>
        </div>
      </div>

      {errorMessage ? <p className="mt-3 text-sm font-semibold text-[#be4b49]" role="status">{errorMessage}</p> : null}

      {items.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => <AniListReleaseCard key={item.id} item={item} />)}
        </div>
      ) : (
        <p className="mt-6 rounded-md border border-dashed border-[#c8dedb] px-4 py-8 text-center text-sm text-[#64748b]">
          현재 AniList에서 불러올 공개 일정이 없습니다. 잠시 후 다시 확인해 주세요.
        </p>
      )}
    </section>
  );
}

function AniListReleaseCard({ item }: { item: AniListAnimeRelease }) {
  const content = (
    <>
      {item.coverImage ? (
        <Image
          src={item.coverImage}
          alt=""
          width={56}
          height={80}
          className="h-16 w-11 shrink-0 rounded-sm bg-[#f2f3ff] object-contain"
        />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block line-clamp-2 text-sm font-bold leading-5 text-[#364576]">{item.title}</span>
        <span className="mt-1 block text-xs text-[#7580ad]">{item.releaseDay ? `${item.releaseMonth}월 ${item.releaseDay}일` : `${item.releaseMonth}월 예정`}</span>
        {item.genres.length ? <span className="mt-1 block truncate text-[11px] text-[#8a95a1]">{item.genres.slice(0, 2).join(" · ")}</span> : null}
      </span>
      {item.siteUrl ? <ExternalLink size={11} className="ml-auto shrink-0" aria-hidden="true" /> : null}
    </>
  );

  const className = "flex min-w-0 items-center gap-2 rounded-md bg-white p-2 text-[#4657b8] shadow-sm ring-1 ring-[#e5e9f8] transition hover:bg-[#f4f5ff] hover:ring-[#c7d0f3]";

  return item.siteUrl ? (
    <a href={item.siteUrl} target="_blank" rel="noopener noreferrer" className={className} title={item.title}>
      {content}
    </a>
  ) : (
    <div className={className} title={item.title}>{content}</div>
  );
}
