import { ArrowRight, Bookmark, CalendarClock, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import {
  getWatchItems,
  watchStatusLabel,
  watchStatusTheme,
  type WatchItem,
} from "@/data/watchlist";

export const metadata = {
  title: "기대작 | Review Collection",
  description: "앞으로 보고 싶은 작품을 모아두는 기대작 목록",
};

export default function WatchlistPage() {
  const items = getWatchItems();
  const featuredItem = items[0];
  const previewItems = items.slice(0, 3);

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <AppNav active="watchlist" />

        <section className="grid gap-8 py-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#eadcc7] bg-white px-3 py-2 text-sm font-bold text-[#9a5a13] shadow-sm">
              <Sparkles size={16} />
              감상 예정 아카이브
            </div>

            <p className="mt-6 text-sm font-bold uppercase text-[#9a5a13]">
              Watchlist
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-[#17202a] sm:text-5xl">
              아직 보지 않은 작품도
              <span className="mt-2 block text-[#b56f1d]">
                미리 붙잡아두기
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#52616b]">
              개봉, 공개, 출시를 기다리는 작품을 따로 모아두는 공간입니다.
              기대 이유와 상태를 남겨두면 나중에 리뷰로 이어가기 좋습니다.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/watchlist/items"
                className="inline-flex items-center gap-2 rounded-md bg-[#b56f1d] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#9a5a13]"
              >
                기대작 전체보기
                <ArrowRight size={18} />
              </Link>
              <Link
                href="#recent-watchlist"
                className="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-5 py-3 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#d9902f] hover:text-[#9a5a13]"
              >
                최근 기대작 보기
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {featuredItem ? <FeaturedWatchItem item={featuredItem} /> : <EmptyFeaturedWatchItem />}
        </section>

        <section id="recent-watchlist" className="scroll-mt-8 pb-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#9a5a13]">Upcoming</p>
              <h2 className="mt-3 text-2xl font-bold text-[#17202a]">
                최근 기대작
              </h2>
            </div>
            <Link
              href="/watchlist/items"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#9a5a13]"
            >
              기대작 전체보기
              <ArrowRight size={16} />
            </Link>
          </div>

          {previewItems.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {previewItems.map((item) => (
                <WatchItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyWatchlist />
          )}
        </section>
      </section>
    </main>
  );
}

function EmptyFeaturedWatchItem() {
  return (
    <article className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-[#eadcc7] bg-[#fffdf8] p-8 text-center shadow-sm">
      <div>
        <Bookmark className="mx-auto text-[#d9902f]" size={28} />
        <h2 className="mt-5 text-2xl font-bold text-[#17202a]">
          아직 작성된 기대작이 없습니다
        </h2>
        <p className="mt-3 leading-7 text-[#52616b]">
          보고 싶은 작품을 추가하면 대표 기대작으로 표시됩니다.
        </p>
      </div>
    </article>
  );
}

function FeaturedWatchItem({ item }: { item: WatchItem }) {
  return (
    <article className="overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] border-l-[#d9902f] bg-white shadow-sm">
      <Image
        src={item.thumbnail}
        alt={item.thumbnailAlt}
        width={960}
        height={540}
        className="aspect-video w-full object-cover"
        loading="eager"
        fetchPriority="high"
      />
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <span className={`rounded-md px-3 py-1 text-sm font-bold ${watchStatusTheme(item.status)}`}>
            {watchStatusLabel(item.status)}
          </span>
          <span className="flex items-center gap-1 text-sm font-bold text-[#9a5a13]">
            <CalendarClock size={16} />
            {item.releaseLabel}
          </span>
        </div>
        <h2 className="mt-5 text-2xl font-bold">{item.title}</h2>
        <p className="mt-2 text-sm text-[#6b7280]">{item.genre.join(", ")}</p>
        <p className="mt-5 line-clamp-3 leading-7 text-[#3f4a54]">
          {item.reason}
        </p>
      </div>
    </article>
  );
}

function EmptyWatchlist() {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-[#eadcc7] bg-[#fffdf8] p-8 text-center shadow-sm">
      <Bookmark className="mx-auto text-[#d9902f]" size={24} />
      <h3 className="mt-4 text-lg font-bold text-[#17202a]">
        아직 작성된 기대작이 없습니다
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#52616b]">
        기대작을 추가하면 최근 항목이 이곳에 정리됩니다.
      </p>
    </div>
  );
}

function WatchItemCard({ item }: { item: WatchItem }) {
  return (
    <article className="overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] border-l-[#d9902f] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <Image
        src={item.thumbnail}
        alt={item.thumbnailAlt}
        width={960}
        height={540}
        className="aspect-video w-full object-cover"
        loading="lazy"
      />
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-md px-3 py-1 text-xs font-bold ${watchStatusTheme(item.status)}`}>
            {watchStatusLabel(item.status)}
          </span>
          <Bookmark size={16} className="text-[#d9902f]" />
        </div>
        <h3 className="mt-5 text-lg font-bold text-[#17202a]">{item.title}</h3>
        <p className="mt-2 text-sm text-[#6b7280]">{item.releaseLabel}</p>
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#3f4a54]">
          {item.reason}
        </p>
      </div>
    </article>
  );
}
