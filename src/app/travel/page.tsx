import { ArrowRight, Bookmark, Star, Sparkles } from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { TravelItinerary } from "@/components/travel/TravelItinerary";
import Image from "next/image";
import {
  getTravels,
  groupTravelPosts,
  categoryLabel,
  categoryTheme,
  type Travel,
} from "@/data/travel";

export const metadata = {
  title: "해외여행 리뷰 | 취향보관소",
  description: "다시 가고 싶은 해외여행 저장소",
};

export default async function TravelPage() {
  const items = await getTravels();
  const travelPosts = groupTravelPosts(items);
  const featuredItem = travelPosts[0]?.travel;
  const previewItems = travelPosts.slice(0, 3);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-10 sm:py-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-7 sm:gap-10">
        <AppNav active="travel" />

        <section className="grid gap-6 py-5 sm:py-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#e8f1fa] bg-white px-3 py-2 text-sm font-bold text-[#2f7f7a] shadow-sm">
              <Sparkles size={16} />
              필요한가 이쪽 아카이브
            </div>

            <p className="mt-6 text-sm font-bold uppercase text-[#5ca1e6]">
              Travel
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-[#17202a] sm:text-5xl">
              아직 보지 않은 작품도
              <span className="mt-2 block text-[#5ca1e6]">
                미리 붙잡아두기
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#52616b]">
              즐거웠던 해외여행을 기록하는 공간입니다.
              다시 가고싶거나 알려주고 싶은곳을 저장하면 좋습니다.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/travel/items"
                className="inline-flex items-center gap-2 rounded-md bg-[#65a30d] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#4d7c0f]"
              >
                해외여행 전체보기
                <ArrowRight size={18} />
              </Link>
              {featuredItem ? (
                <Link
                  href={`/travel/${featuredItem.id}`}
                  className="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-5 py-3 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#38a39b] hover:text-[#2f7f7a]"
                >
                  최근 여행리뷰 보기
                  <ArrowRight size={18} />
                </Link>
              ) : null}
            </div>
          </div>

          {featuredItem ? <FeaturedTravelItem item={featuredItem} /> : <EmptyFeaturedTravelItem />}
        </section>

        <TravelItinerary items={items} />

        <section id="recent-travel" className="scroll-mt-8 pb-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#5ca1e6]">Upcoming</p>
              <h2 className="mt-3 text-2xl font-bold text-[#17202a]">
                최근 해외여행 리뷰
              </h2>
            </div>
            <Link
              href="/travel/items"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#4d7c0f] hover:text-[#3f6212]"
            >
              해외여행 전체보기
              <ArrowRight size={16} />
            </Link>
          </div>

          {previewItems.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {previewItems.map(({ travel, placeCount }) => (
                <TravelItemCard key={travel.id} item={travel} placeCount={placeCount} />
              ))}
            </div>
          ) : (
            <EmptyTravel />
          )}
        </section>
      </section>
    </main>
  );
}

function EmptyFeaturedTravelItem() {
  return (
    <article className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-[#eadcc7] bg-[#fffdf8] p-8 text-center shadow-sm">
      <div>
        <Bookmark className="mx-auto text-[#4584c4]" size={28} />
        <h2 className="mt-5 text-2xl font-bold text-[#17202a]">
          아직 작성된 여행리뷰가 없습니다
        </h2>
        <p className="mt-3 leading-7 text-[#52616b]">
          보고 싶은 작품이 있을린 없잖아. 여행리뷰인데
        </p>
      </div>
    </article>
  );
}

function FeaturedTravelItem({ item }: { item:  Travel}) {
  return (
    <article className="overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] border-l-[#4584c4] bg-white shadow-sm">
      <Image
        src={item.thumbnail}
        alt={item.thumbnailAlt}
        width={960}
        height={540}
        className="aspect-video h-auto w-full object-cover"
        loading="lazy"
      />
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <span className={`rounded-md px-3 py-1 text-sm font-bold ${categoryTheme(item.category)}`}>
            {categoryLabel(item.category)}
          </span>
          <span className="flex items-center gap-1 text-sm font-bold text-[#4584c4]">
            <Star size={15} fill="#f2b84b" color="#f2b84b" />
            {item.rating}
          </span>
        </div>
        <h2 className="mt-5 text-2xl font-bold">{item.tripTitle ?? item.title}</h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          {item.authorName ? ` · ${item.authorName}` : ""}
        </p>
        <p className="mt-5 line-clamp-3 leading-7 text-[#3f4a54]">
          {item.review}
        </p>
      </div>
    </article>
  );
}

function EmptyTravel() {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-[#eadcc7] bg-[#fffdf8] p-8 text-center shadow-sm">
      <Bookmark className="mx-auto text-[#5ca1e6]" size={24} />
      <h3 className="mt-4 text-lg font-bold text-[#17202a]">
        아직 작성된 여행리뷰가 없습니다
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#52616b]">
        여행리뷰를 추가하면 최근 항목이 이곳에 정리됩니다.
      </p>
    </div>
  );
}

function TravelItemCard({ item, placeCount }: { item: Travel; placeCount: number }) {
  return (
    <Link
      href={`/travel/${item.id}`}
      className="block overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] border-l-[#5ca1e6] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <Image
        src={item.thumbnail}
        alt={item.thumbnailAlt}
        width={960}
        height={540}
        className="aspect-video h-auto w-full object-cover"
        loading="lazy"
      />
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-md px-3 py-1 text-xs font-bold ${categoryTheme(item.category)}`}>
            {categoryLabel(item.category)}
          </span>
          <Bookmark size={16} className="text-[#5ca1e6]" />
        </div>
        <h3 className="mt-5 text-lg font-bold text-[#17202a]">{item.tripTitle ?? item.title}</h3>
        <p className="mt-2 text-xs font-bold text-[#4d7c0f]">여행 장소 {placeCount}곳</p>
        <p className="mt-2 text-sm text-[#6b7280]">
          {item.visitedAt}
          {item.authorName ? ` · ${item.authorName}` : ""}
        </p>
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#3f4a54]">
          {item.review}
        </p>
      </div>
    </Link>
  );
}
