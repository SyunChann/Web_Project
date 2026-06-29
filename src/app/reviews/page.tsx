import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import {
  getReviews,
  sortReviews,
  typeLabel,
  typeTheme,
  type ReviewSort,
} from "@/data/reviews";

type ReviewsPageProps = {
  searchParams?: Promise<{ sort?: string | string[] }>;
};

const sortOptions: { value: ReviewSort; label: string }[] = [
  {
    value: "created-desc",
    label: "작성일 최신순",
  },
  {
    value: "watched-desc",
    label: "감상일 최신순",
  },
  {
    value: "rating-desc",
    label: "별점 높은순",
  },
];

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const params = await searchParams;
  const activeSort = parseSort(params?.sort);
  const reviews = sortReviews(await getReviews(), activeSort);

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
          <div className="mt-6 flex flex-wrap gap-2">
            {sortOptions.map((option) => {
              const isActive = option.value === activeSort;

              return (
                <Link
                  key={option.value}
                  href={option.value === "created-desc" ? "/reviews" : `/reviews?sort=${option.value}`}
                  className={`rounded-md border px-4 py-2 text-sm font-bold shadow-sm transition ${
                    isActive
                      ? "border-[#be4b49] bg-[#be4b49] text-white"
                      : "border-[#d8cfc2] bg-white text-[#52616b] hover:border-[#be4b49] hover:text-[#be4b49]"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </header>

        {reviews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((review, index) => {
              const theme = typeTheme(review.type);
              const isAboveFoldImage = index < 3;
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
                    loading={isAboveFoldImage ? "eager" : "lazy"}
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
                      작성 {formatDate(review.createdAt)} · 감상 {formatDate(review.watchedAt)}
                    </p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {review.genre.join(", ")}
                    </p>
                    <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[#3f4a54]">
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

function parseSort(value: string | string[] | undefined): ReviewSort {
  const sortValue = Array.isArray(value) ? value[0] : value;

  if (sortValue === "watched-desc" || sortValue === "rating-desc") {
    return sortValue;
  }

  return "created-desc";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
