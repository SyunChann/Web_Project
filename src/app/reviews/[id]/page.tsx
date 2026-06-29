import { ArrowLeft, Calendar, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReview, reviews, typeLabel } from "@/data/reviews";

type ReviewDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export function generateStaticParams() {
  return reviews.map((review) => ({
    id: review.id,
  }));
}

export async function generateMetadata({ params }: ReviewDetailPageProps) {
  const { id } = await params;
  const review = getReview(id);

  return {
    title: review ? `${review.title} | Review Collection` : "리뷰 없음",
    description: review?.summary ?? "리뷰를 찾을 수 없습니다.",
  };
}

export default async function ReviewDetailPage({
  params,
}: ReviewDetailPageProps) {
  const { id } = await params;
  const review = getReview(id);

  if (!review) {
    notFound();
  }

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <article className="mx-auto w-full max-w-3xl">
        <Link
          href="/reviews"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#be4b49]"
        >
          <ArrowLeft size={17} />
          리뷰 목록
        </Link>

        <header className="mt-8 rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-[#edf2ef] px-3 py-1 text-sm font-bold text-[#2f6f5e]">
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
