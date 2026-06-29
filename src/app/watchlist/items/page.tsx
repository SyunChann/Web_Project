import { ArrowLeft, Bookmark } from "lucide-react";
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
  title: "전체 기대작 | Review Collection",
  description: "앞으로 보고 싶은 기대작 전체 목록",
};

export default function WatchlistItemsPage() {
  const items = getWatchItems();

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-5xl">
        <AppNav active="watchlist" />

        <header className="py-10">
          <Link
            href="/watchlist"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#9a5a13]"
          >
            <ArrowLeft size={17} />
            기대작 홈
          </Link>
          <p className="mt-8 text-sm font-semibold text-[#9a5a13]">Watchlist</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">전체 기대작</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#52616b]">
            아직 감상하지 않았지만 기억해두고 싶은 작품을 모아둔 목록입니다.
          </p>
        </header>

        {items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {items.map((item) => (
              <WatchItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#eadcc7] bg-[#fffdf8] p-8 text-center shadow-sm">
            <Bookmark className="mx-auto text-[#d9902f]" size={24} />
            <h2 className="mt-4 text-lg font-bold text-[#17202a]">
              아직 작성된 기대작이 없습니다
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#52616b]">
              기대작을 추가하면 전체 목록에서 한 번에 확인할 수 있습니다.
            </p>
          </div>
        )}
      </section>
    </main>
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
        <h2 className="mt-5 text-lg font-bold text-[#17202a]">{item.title}</h2>
        <p className="mt-2 text-sm text-[#6b7280]">{item.releaseLabel}</p>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#3f4a54]">
          {item.reason}
        </p>
      </div>
    </article>
  );
}
