import { ArrowLeft, ArrowRight, Calendar, Pencil, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteReview } from "@/app/actions/reviews";
import { AppNav } from "@/components/AppNav";
import { DeleteReviewButton } from "@/components/reviews/DeleteReviewButton";
import {
  getReview,
  getReviews,
  sortReviews,
  typeLabel,
  typeTheme,
  type Review,
} from "@/data/reviews";
import { canManageContent } from "@/lib/contentPermissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getYouTubeEmbedUrl } from "@/lib/supabase/utils";

type ReviewDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateStaticParams() {
  const reviews = await getReviews();

  return reviews.map((review) => ({
    id: review.id,
  }));
}

export async function generateMetadata({ params }: ReviewDetailPageProps) {
  const { id } = await params;
  const review = await getReview(id);

  return {
    title: review ? `${review.title} | 취향보관소` : "리뷰 없음",
    description: review?.summary ?? "리뷰를 찾을 수 없습니다.",
  };
}

export default async function ReviewDetailPage({
  params,
}: ReviewDetailPageProps) {
  const { id } = await params;
  const review = await getReview(id);

  if (!review) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const theme = typeTheme(review.type);
  const deleteAction = deleteReview.bind(null, review.id);
  const canManageReview = canManageContent(user, review.authorId);

  // DB에 저장된 유튜브 주소를 임베드용 주소로 변환
  const embedUrl = getYouTubeEmbedUrl(review.youtubeUrl);
  const orderedReviews = sortReviews(await getReviews(), "created-desc");
  const currentIndex = orderedReviews.findIndex((item) => item.id === review.id);
  const previousReview =
    currentIndex >= 0 ? orderedReviews[currentIndex + 1] : undefined;
  const nextReview =
    currentIndex > 0 ? orderedReviews[currentIndex - 1] : undefined;

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="reviews" />
        <article className="mx-auto mt-10 w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#be4b49]"
          >
            <ArrowLeft size={17} />
            리뷰 목록
          </Link>

          {canManageReview ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/reviews/${review.id}/edit`}
                className="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#be4b49] hover:text-[#be4b49]"
              >
                <Pencil size={16} />
                수정
              </Link>
              <form action={deleteAction}>
                <DeleteReviewButton title={review.title} />
              </form>
            </div>
          ) : null}
        </div>

        <header
          className={`mt-8 overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme.border} bg-white shadow-sm`}
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
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-md px-3 py-1 text-sm font-bold ${theme.badge}`}
              >
                {typeLabel(review.type)}
              </span>
              {review.genre.map((genre) => (
                <span
                  key={genre}
                  className="rounded-md bg-[#f3e6d8] px-3 py-1 text-sm font-semibold text-[#8a3b2f]"
                >
                  {genre}
                </span>
              ))}
            </div>

            <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">
              {review.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-bold text-[#52616b]">
              <span className="flex items-center gap-2">
                <Star size={17} fill="#f2b84b" color="#f2b84b" />
                <span className="text-[#6d470c]">별점</span>
                {review.rating} / 5
              </span>
              <span className="flex items-center gap-2">
                <Calendar size={17} />
                <span className="text-[#4f5fb8]">감상일</span>
                {formatFullDate(review.watchedAt)}
              </span>
              <span className="flex items-center gap-2">
                <Calendar size={17} />
                <span className="text-[#a33f3c]">작성일</span>
                {formatFullDate(review.createdAt)}
              </span>
              {review.authorName ? (
                <span>
                  <span className="text-[#6d470c]">작성자:</span>{" "}
                  {review.authorName}
                </span>
              ) : null}
            </div>

            <p className="mt-6 whitespace-pre-wrap text-lg leading-8 text-[#3f4a54]">
              {review.summary}
            </p>
          </div>
        </header>

        {embedUrl ? (
          <section className="mt-8 rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#fde8e7] text-[#be4b49]">
                <Play size={18} fill="currentColor" />
              </span>
              <div>
                <h2 className="text-xl font-bold">관련 영상</h2>
                <p className="mt-1 text-sm font-semibold text-[#6b7280]">
                  작품을 다시 떠올릴 수 있는 영상입니다.
                </p>
              </div>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                src={embedUrl}
                title={`${review.title} 관련 영상`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                className="absolute top-0 left-0 h-full w-full border-0"
              />
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">감상평</h2>
          <p className="mt-4 whitespace-pre-wrap leading-8 text-[#3f4a54]">
            {review.review}
          </p>
        </section>
        {previousReview || nextReview ? (
          <nav
            aria-label="리뷰 이전 다음 글"
            className="mt-8 grid gap-4 sm:grid-cols-2"
          >
            {previousReview ? (
              <ReviewAdjacentCard
                review={previousReview}
                label="이전 리뷰"
                direction="previous"
              />
            ) : (
              <div className="hidden sm:block" />
            )}
            {nextReview ? (
              <ReviewAdjacentCard
                review={nextReview}
                label="다음 리뷰"
                direction="next"
              />
            ) : null}
          </nav>
        ) : null}
        </article>
      </section>
    </main>
  );
}

function ReviewAdjacentCard({
  review,
  label,
  direction,
}: {
  review: Review;
  label: string;
  direction: "previous" | "next";
}) {
  const theme = typeTheme(review.type);
  const Icon = direction === "previous" ? ArrowLeft : ArrowRight;

  return (
    <Link
      href={`/reviews/${review.id}`}
      className={`group grid grid-cols-[88px_1fr] overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme.border} bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
    >
      <Image
        src={review.thumbnail}
        alt={review.thumbnailAlt}
        width={176}
        height={112}
        className="h-full min-h-28 w-full object-cover"
        loading="lazy"
      />
      <div className="min-w-0 p-4">
        <p className="flex items-center gap-2 text-xs font-bold text-[#be4b49]">
          {direction === "previous" ? <Icon size={14} /> : null}
          {label}
          {direction === "next" ? <Icon size={14} /> : null}
        </p>
        <h2 className="mt-2 line-clamp-2 font-bold leading-6 transition group-hover:text-[#be4b49]">
          {review.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#6b7280]">
          <span>{formatDate(review.createdAt)}</span>
          <span className="flex items-center gap-1">
            <Star size={13} fill="#f2b84b" color="#f2b84b" />
            {review.rating}
          </span>
        </div>
      </div>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatFullDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
