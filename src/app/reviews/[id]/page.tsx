import { ArrowLeft, Calendar, Pencil, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteReview } from "@/app/actions/reviews";
import { getReview, getReviews, typeLabel, typeTheme } from "@/data/reviews";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    title: review ? `${review.title} | Review Collection` : "리뷰 없음",
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

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <article className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#be4b49]"
          >
            <ArrowLeft size={17} />
            리뷰 목록
          </Link>

          {user ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/reviews/${review.id}/edit`}
                className="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#be4b49] hover:text-[#be4b49]"
              >
                <Pencil size={16} />
                수정
              </Link>
              <form action={deleteAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-md bg-[#be4b49] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
                >
                  <Trash2 size={16} />
                  삭제
                </button>
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

            <div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold text-[#52616b]">
              <span className="flex items-center gap-2">
                <Star size={17} fill="#f2b84b" color="#f2b84b" />
                {review.rating} / 5
              </span>
              <span className="flex items-center gap-2">
                <Calendar size={17} />
                {review.watchedAt}
              </span>
            </div>

            <p className="mt-6 text-lg leading-8 text-[#3f4a54]">
              {review.summary}
            </p>
          </div>
        </header>

        <section className="mt-8 rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">감상평</h2>
          <p className="mt-4 whitespace-pre-line leading-8 text-[#3f4a54]">
            {review.review}
          </p>
        </section>
      </article>
    </main>
  );
}
