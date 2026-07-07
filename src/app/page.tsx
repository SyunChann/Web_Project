import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Library,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { StatusToast } from "@/components/StatusToast";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { getReviews, typeLabel, typeTheme, type Review } from "@/data/reviews";
import {
  getWatchItems,
  watchStatusLabel,
  type WatchItem,
} from "@/data/watchlist";

const reviewTypes: Review["type"][] = ["movie", "anime", "game", "drama"];

type HomeProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

function getStatusMessage(status?: string) {
  if (status === "login") {
    return "로그인되었습니다.";
  }

  if (status === "logout") {
    return "로그아웃되었습니다.";
  }

  return "";
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await searchParams;
  const statusMessage = getStatusMessage(resolvedSearchParams?.status);
  const reviews = await getReviews();
  const watchItems = await getWatchItems();
  const featuredReview = reviews[0];
  const recentReviews = reviews.slice(0, 3);
  const previewWatchItems = watchItems.slice(0, 3);
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <main className="min-h-screen overflow-hidden px-6 py-8 sm:px-10">
      {statusMessage ? (
        <StatusToast key={statusMessage} message={statusMessage} />
      ) : null}
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
                취향보관소
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-[#17202a] sm:text-5xl">
                감상은 짧게 지나가도
                <span className="mt-2 block text-[#be4b49]">
                  기록은 오래 남도록
                </span>
              </h1>
            </div>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[#52616b]">
              영화, 애니, 게임, 드라마의 감상과 기대작을 한곳에 모아두는
              개인 콘텐츠 보관소입니다.
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
                label="최근 작성"
                value={featuredReview ? formatDate(featuredReview.createdAt) : "-"}
              />
            </div>
          </div>

          {featuredReview ? (
            <FeaturedReview review={featuredReview} />
          ) : (
            <EmptyFeature />
          )}
        </section>

        <section className="rounded-lg border border-[#eadcc7] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#2f7f7a]">Watchlist</p>
              <h2 className="mt-3 text-2xl font-bold text-[#17202a]">
                기대작 기록
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-[#52616b]">
                아직 보지 않은 작품도 따로 묶어두고, 나중에 리뷰로 이어갈 수
                있게 관리합니다.
              </p>
            </div>
            {previewWatchItems[0] ? (
              <Link
                href={`/watchlist/${previewWatchItems[0].id}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-[#2f7f7a]"
              >
                최근 기대작 보기
                <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>

          {previewWatchItems.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {previewWatchItems.map((item) => (
                <WatchPreviewCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-[#eadcc7] bg-[#fffdf8] p-6 text-center shadow-sm">
              <h3 className="text-lg font-bold text-[#17202a]">
                아직 작성된 기대작이 없습니다
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#52616b]">
                기대작을 추가하면 여기에 최근 항목이 표시됩니다.
              </p>
            </div>
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
                {recentReviews.map((review, index) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    eager={index === 0}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-[#cfc5b8] bg-white p-8 text-center shadow-sm">
                <h3 className="text-xl font-bold">아직 리뷰가 없습니다</h3>
                <p className="mt-3 leading-7 text-[#52616b]">
                  새 리뷰를 작성하면 최근 기록이 이곳에 표시됩니다.
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

function WatchPreviewCard({ item }: { item: WatchItem }) {
  return (
    <Link
      href={`/watchlist/${item.id}`}
      className="rounded-lg border border-l-4 border-[#ddd6cc] border-l-[#38a39b] bg-[#f7fffd] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md bg-[#e4f4f2] px-3 py-1 text-xs font-bold text-[#2f7f7a]">
          {watchStatusLabel(item.status)}
        </span>
        <Bookmark size={16} className="text-[#38a39b]" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-[#17202a]">{item.title}</h3>
      <p className="mt-2 text-sm text-[#6b7280]">
        {item.releaseLabel}
        {item.authorName ? ` · ${item.authorName}` : ""}
      </p>
      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#3f4a54]">
        {item.reason}
      </p>
    </Link>
  );
}

function FeaturedReview({ review }: { review: Review }) {
  const theme = typeTheme(review.type);

  return (
    <article
      className={`overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme.border} bg-white shadow-sm`}
    >
      <ThumbnailImage
        src={review.thumbnail}
        alt={review.thumbnailAlt}
        title={review.title}
        label={typeLabel(review.type)}
        tone={review.type}
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
          {review.authorName ? ` · ${review.authorName}` : ""}
        </p>
        <p className="mt-5 line-clamp-3 leading-7 text-[#3f4a54]">
          {review.summary}
        </p>
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

function ReviewCard({ review, eager = false }: { review: Review; eager?: boolean }) {
  const theme = typeTheme(review.type);

  return (
    <Link
      href={`/reviews/${review.id}`}
      className={`overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme.border} bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
    >
      <ThumbnailImage
        src={review.thumbnail}
        alt={review.thumbnailAlt}
        title={review.title}
        label={typeLabel(review.type)}
        tone={review.type}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
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
        <p className="mt-2 text-sm text-[#6b7280]">
          {formatDate(review.watchedAt)}
          {review.authorName ? ` · ${review.authorName}` : ""}
        </p>
      </div>
    </Link>
  );
}

function EmptyFeature() {
  return (
    <div className="rounded-lg border border-dashed border-[#cfc5b8] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-[#be4b49]">리뷰 없음</p>
      <h2 className="mt-4 text-2xl font-bold">
        아직 추천할 리뷰가 없습니다
      </h2>
      <p className="mt-3 leading-7 text-[#52616b]">
        새 리뷰를 작성하면 이 영역에 추천 리뷰가 표시됩니다.
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
