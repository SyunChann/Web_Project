import { ArrowRight, CalendarDays, Library, Sparkles, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { getReviews, typeLabel, typeTheme, type Review } from "@/data/reviews";

const reviewTypes: Review["type"][] = ["movie", "anime", "game", "drama"];

export default async function Home() {
  const reviews = await getReviews();
  const featuredReview = reviews[0];
  const recentReviews = reviews.slice(0, 3);
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <main className="min-h-screen overflow-hidden px-6 py-8 sm:px-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <AppNav active="home" />

        <section className="grid gap-8 py-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#e2d9ce] bg-white px-3 py-2 text-sm font-bold text-[#be4b49] shadow-sm">
              <Sparkles size={16} />
              개인 콘텐츠 아카이브
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold uppercase text-[#9a5a13]">
                Review Collection
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-[#17202a] sm:text-5xl">
                감상은 짧게 지나가도
                <span className="mt-2 block text-[#be4b49]">
                  기록은 오래 남도록
                </span>
              </h1>
            </div>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[#52616b]">
              영화, 애니, 게임, 드라마의 별점과 감상평을 한곳에 모아두는
              개인 리뷰 컬렉션입니다.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 rounded-md bg-[#be4b49] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
              >
                전체 리뷰 보기
                <ArrowRight size={18} />
              </Link>
              {featuredReview ? (
                <Link
                  href={`/reviews/${featuredReview.id}`}
                  className="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-5 py-3 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#be4b49] hover:text-[#be4b49]"
                >
                  최근 리뷰 읽기
                  <ArrowRight size={18} />
                </Link>
              ) : null}
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <StatItem
                icon={<Library size={18} />}
                label="기록한 리뷰"
                value={`${reviews.length}개`}
              />
              <StatItem
                icon={<Star size={18} />}
                label="평균 별점"
                value={reviews.length > 0 ? averageRating.toFixed(1) : "-"}
              />
              <StatItem
                icon={<CalendarDays size={18} />}
                label="최근 감상"
                value={featuredReview ? formatDate(featuredReview.watchedAt) : "-"}
              />
            </div>
          </div>

          {featuredReview ? (
            <FeaturedReview review={featuredReview} />
          ) : (
            <EmptyFeature />
          )}
        </section>

        <section className="grid gap-8 pb-12 lg:grid-cols-[280px_1fr]">
          <div>
            <p className="text-sm font-bold text-[#be4b49]">Categories</p>
            <h2 className="mt-3 text-2xl font-bold text-[#17202a]">
              카테고리별 기록
            </h2>
            <div className="mt-5 grid gap-3">
              {reviewTypes.map((type) => {
                const theme = typeTheme(type);
                const count = reviews.filter((review) => review.type === type).length;

                return (
                  <div
                    key={type}
                    className={`flex items-center justify-between rounded-md border border-l-4 border-[#ddd6cc] ${theme.border} bg-white px-4 py-3 shadow-sm`}
                  >
                    <span className={`rounded-md px-3 py-1 text-sm font-bold ${theme.badge}`}>
                      {typeLabel(type)}
                    </span>
                    <span className="text-sm font-bold text-[#17202a]">
                      {count}개
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#be4b49]">Recent Reviews</p>
                <h2 className="mt-3 text-2xl font-bold text-[#17202a]">
                  최근 기록
                </h2>
              </div>
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#be4b49]"
              >
                더 보기
                <ArrowRight size={16} />
              </Link>
            </div>

            {recentReviews.length > 0 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {recentReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-[#cfc5b8] bg-white p-8 text-center shadow-sm">
                <h3 className="text-xl font-bold">아직 리뷰가 없습니다</h3>
                <p className="mt-3 leading-7 text-[#52616b]">
                  Supabase `reviews` 테이블에 데이터가 들어오면 최근 기록이
                  표시됩니다.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#ddd6cc] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#be4b49]">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-[#6b7280]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#17202a]">{value}</p>
    </div>
  );
}

function FeaturedReview({ review }: { review: Review }) {
  const theme = typeTheme(review.type);

  return (
    <article
      className={`overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme.border} bg-white shadow-sm`}
    >
      <Image
        src={review.thumbnail}
        alt={review.thumbnailAlt}
        width={960}
        height={540}
        className="aspect-video w-full object-cover"
        loading="eager"
        fetchPriority="high"
      />
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <span
            className={`rounded-md px-3 py-1 text-sm font-semibold ${theme.badge}`}
          >
            추천 {typeLabel(review.type)}
          </span>
          <span className="flex items-center gap-1 text-sm font-bold">
            <Star size={16} fill="#f2b84b" color="#f2b84b" />
            {review.rating}
          </span>
        </div>
        <h2 className="mt-5 text-2xl font-bold">{review.title}</h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          {typeLabel(review.type)} · {review.genre.join(", ")}
        </p>
        <p className="mt-5 leading-7 text-[#3f4a54]">{review.summary}</p>
        <Link
          href={`/reviews/${review.id}`}
          className={`mt-6 inline-flex items-center gap-2 text-sm font-bold ${theme.text}`}
        >
          자세히 읽기
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const theme = typeTheme(review.type);

  return (
    <Link
      href={`/reviews/${review.id}`}
      className={`overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme.border} bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
    >
      <Image
        src={review.thumbnail}
        alt={review.thumbnailAlt}
        width={960}
        height={540}
        className="aspect-video w-full object-cover"
      />
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-md px-3 py-1 text-xs font-bold ${theme.badge}`}>
            {typeLabel(review.type)}
          </span>
          <span className="flex items-center gap-1 text-sm font-bold">
            <Star size={15} fill="#f2b84b" color="#f2b84b" />
            {review.rating}
          </span>
        </div>
        <h3 className="mt-5 text-lg font-bold text-[#17202a]">{review.title}</h3>
        <p className="mt-2 text-sm text-[#6b7280]">{formatDate(review.watchedAt)}</p>
      </div>
    </Link>
  );
}

function EmptyFeature() {
  return (
    <div className="rounded-lg border border-dashed border-[#cfc5b8] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-[#be4b49]">리뷰 없음</p>
      <h2 className="mt-4 text-2xl font-bold">
        Supabase에 첫 리뷰를 추가해 주세요
      </h2>
      <p className="mt-3 leading-7 text-[#52616b]">
        `reviews` 테이블에 데이터가 들어오면 이 영역에 추천 리뷰가 표시됩니다.
      </p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
