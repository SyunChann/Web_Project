import { ArrowRight, Utensils, Star, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import {
  getRestaurantsReviews,
  categoryLabel,
  categoryTheme,
  type RestaurantsReview,
} from "@/data/restaurants";

export const metadata = {
  title: "맛집리뷰 | 취향보관소",
  description: "저장하고 또 가고싶은 맛집을 모아두는 맛집 목록",
};

export default async function RestaurantsReviewPage() {
  const items = await getRestaurantsReviews();
  const featuredItem = items[0];
  const previewItems = items.slice(0, 3);

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <AppNav active="domestic-restaurants-map" />

        <section className="grid gap-8 py-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#e57632] bg-white px-3 py-2 text-sm font-bold text-[#e57632] shadow-sm">
              <Sparkles size={16} />
              맛집 아카이브
            </div>

            <p className="mt-6 text-sm font-bold uppercase text-[#e57632]">
              restaurant
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-[#17202a] sm:text-5xl">
              다녀온 맛집을 기록하여
              <span className="mt-2 block text-[#e57632]">
                메뉴 결정에 효율성 높이기
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#52616b]">
              다녀온 맛집을 모아두는 공간입니다.
              맛집의 분위기와 방문평을 남겨두면 나중에 리뷰로 이어가기 좋습니다.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/restaurants/items"
                className="inline-flex items-center gap-2 rounded-md bg-[#e57632] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#c85a17]"
              >
                맛집 전체보기
                <ArrowRight size={18} />
              </Link>
              {featuredItem ? (
                <Link
                  href={`/restaurants/${featuredItem.id}`}
                  className="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-5 py-3 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#e57632] hover:text-[#e57632]"
                >
                  최근 맛집 보기
                  <ArrowRight size={18} />
                </Link>
              ) : null}
            </div>
          </div>

          {featuredItem ? <FeaturedWatchItem item={featuredItem} /> : <EmptyFeaturedWatchItem />}
        </section>

        <section id="recent-restaurants" className="scroll-mt-8 pb-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#e57632]">Upcoming</p>
              <h2 className="mt-3 text-2xl font-bold text-[#17202a]">
                최근 맛집
              </h2>
            </div>
            <Link
              href="/restaurants/items"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#e57632]"
            >
              맛집 전체보기
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
            <EmptyRestaurants />
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
        <Utensils className="mx-auto text-[#e57632]" size={28} />
        <h2 className="mt-5 text-2xl font-bold text-[#17202a]">
          아직 작성된 맛집이 없습니다
        </h2>
        <p className="mt-3 leading-7 text-[#52616b]">
          다녀온 맛집을 추가하면 대표 맛집으로 표시됩니다.
        </p>
      </div>
    </article>
  );
}

function FeaturedWatchItem({ item }: { item: RestaurantsReview }) {
  return (
    <article className="overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] border-l-[#e57632] bg-white shadow-sm">
      <Image
        src={item.thumbnail}
        alt={item.thumbnailAlt}
        width={960}
        height={540}
        className="aspect-video h-auto w-full object-cover"
        loading="eager"
        fetchPriority="high"
      />
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <span className={`rounded-md px-3 py-1 text-sm font-bold ${categoryTheme(item.category)}`}>
            {categoryLabel(item.category)}
          </span>
          <span className="flex items-center gap-1 text-sm font-bold text-[#e57632]">
            <Star size={15} fill="#f2b84b" color="#f2b84b" />
            {item.rating}
          </span>
        </div>
        <h2 className="mt-5 text-2xl font-bold">{item.title}</h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          {item.companion}
          {item.authorName ? ` · ${item.authorName}` : ""}
        </p>
        <p className="mt-5 line-clamp-3 leading-7 text-[#3f4a54]">
          {item.review}
        </p>
      </div>
    </article>
  );
}

function EmptyRestaurants() {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-[#eadcc7] bg-[#fffdf8] p-8 text-center shadow-sm">
      <Utensils className="mx-auto text-[#e57632]" size={24} />
      <h3 className="mt-4 text-lg font-bold text-[#17202a]">
        아직 작성된 맛집이 없습니다
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#52616b]">
        맛집을 추가하면 최근 항목이 이곳에 정리됩니다.
      </p>
    </div>
  );
}

function WatchItemCard({ item }: { item: RestaurantsReview }) {
  return (
    <Link
      href={`/restaurants/${item.id}`}
      className="block overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] border-l-[#e57632] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
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
          <Utensils size={16} className="text-[#e57632]" />
        </div>
        <h3 className="mt-5 text-lg font-bold text-[#17202a]">{item.title}</h3>
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