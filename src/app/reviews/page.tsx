import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import { reviews, typeLabel, typeTheme } from "@/data/reviews";

export default function ReviewsPage() {
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-5xl">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            Review Collection
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#be4b49]"
          >
            <ArrowLeft size={16} />
            홈으로
          </Link>
        </nav>

        <header className="py-10">
          <p className="text-sm font-semibold text-[#be4b49]">Reviews</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">전체 리뷰</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#52616b]">
            지금은 샘플 데이터로 구성한 최소 버전입니다. 이후 검색, 장르
            필터, 리뷰 작성 기능을 붙여 확장할 수 있습니다.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((review) => {
            const theme = typeTheme(review.type);

            return (
              <Link
                key={review.id}
                href={`/reviews/${review.id}`}
                className={`rounded-lg border border-l-4 border-[#ddd6cc] ${theme.border} bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-md px-3 py-1 text-xs font-bold ${theme.badge}`}
                  >
                    {typeLabel(review.type)}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-bold">
                    <Star size={15} fill="#f2b84b" color="#f2b84b" />
                    {review.rating}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-bold">{review.title}</h2>
                <p className="mt-2 text-sm text-[#6b7280]">
                  {review.genre.join(", ")}
                </p>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#3f4a54]">
                  {review.summary}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
