import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { getReviews, typeLabel, typeTheme } from "@/data/reviews";

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-5xl">
        <AppNav active="reviews" />

        <header className="py-10">
          <p className="text-sm font-semibold text-[#be4b49]">Reviews</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">전체 리뷰</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#52616b]">
            Supabase에 저장된 리뷰를 불러옵니다. 영화, 애니, 게임, 드라마
            감상 기록을 한곳에서 확인할 수 있습니다.
          </p>
        </header>

        {reviews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((review, index) => {
              const theme = typeTheme(review.type);
              const isFirstImage = index === 0;

              return (
                <Link
                  key={review.id}
                  href={`/reviews/${review.id}`}
                  className={`overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme.border} bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
                >
                  <Image
                    src={review.thumbnail}
                    alt={review.thumbnailAlt}
                    width={960}
                    height={540}
                    className="aspect-video w-full object-cover"
                    loading={isFirstImage ? "eager" : "lazy"}
                    fetchPriority={isFirstImage ? "high" : "auto"}
                  />
                  <div className="p-5">
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
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#cfc5b8] bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold">아직 리뷰가 없습니다</h2>
            <p className="mt-3 leading-7 text-[#52616b]">
              Supabase `reviews` 테이블에 데이터를 추가하면 여기에 표시됩니다.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
