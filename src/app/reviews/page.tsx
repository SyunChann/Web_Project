import { Search, Star, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import Pagination from "@/components/Pagination";
import {
  getReviews,
  sortReviews,
  typeLabel,
  typeTheme,
  type Review,
  type ReviewSort,
} from "@/data/reviews";

type ReviewsPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    sort?: string | string[];
    type?: string | string[];
    page?: string;
  }>;
};


type ReviewType = Review["type"];
type ReviewTypeFilter = ReviewType | "all";

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

const typeOptions: { value: ReviewTypeFilter; label: string }[] = [
  {
    value: "all",
    label: "전체",
  },
  {
    value: "movie",
    label: "영화",
  },
  {
    value: "anime",
    label: "애니",
  },
  {
    value: "game",
    label: "게임",
  },
  {
    value: "drama",
    label: "드라마",
  },
];

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const params = await searchParams;
  const activeQuery = parseSearchValue(params?.q);
  const activeSort = parseSort(params?.sort);
  const activeType = parseType(params?.type);
  const reviews = sortReviews(
    filterReviews(await getReviews(), activeQuery, activeType),
    activeSort,
  );
  const isFiltered = Boolean(activeQuery) || activeType !== "all";

  const currentPage = Number(params?.page) || 1;
  const ITEMS_PER_PAGE = 9;

  const filteredReviews = sortReviews(
    filterReviews(await getReviews(), activeQuery, activeType),
    activeSort,
  );

  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE);
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-5xl">
        <AppNav active="reviews" />

        <header className="py-10">
          <p className="text-sm font-semibold text-[#be4b49]">Reviews</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">전체 리뷰</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#52616b]">
            영화, 애니, 게임, 드라마 감상 기록을 한곳에서 확인할 수
            있습니다.
          </p>
        </header>

        <section className="mb-8 rounded-lg border border-[#ddd6cc] bg-white p-4 shadow-sm">
          <form
            action="/reviews"
            className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center"
          >
            {activeType !== "all" ? (
              <input type="hidden" name="type" value={activeType} />
            ) : null}
            {activeSort !== "created-desc" ? (
              <input type="hidden" name="sort" value={activeSort} />
            ) : null}
            <label className="relative block">
              <Search
                size={18}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-[#8a95a1]"
              />
              <input
                name="q"
                type="search"
                defaultValue={activeQuery}
                placeholder="제목, 장르, 요약 검색"
                className="h-11 w-full rounded-md border border-[#d8cfc2] bg-[#fbfaf7] pr-3 pl-10 text-sm font-semibold outline-none transition placeholder:text-[#8a95a1] focus:border-[#be4b49] focus:bg-white"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-md bg-[#be4b49] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
            >
              검색
            </button>
            {isFiltered ? (
              <Link
                href={buildReviewsHref({
                  query: "",
                  type: "all",
                  sort: activeSort,
                })}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#be4b49] hover:text-[#be4b49]"
              >
                <X size={16} />
                초기화
              </Link>
            ) : null}
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((option) => {
                const isActive = option.value === activeType;

                return (
                  <Link
                    key={option.value}
                    href={buildReviewsHref({
                      query: activeQuery,
                      type: option.value,
                      sort: activeSort,
                    })}
                    className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                      isActive
                        ? "border-[#be4b49] bg-[#fff7f5] text-[#be4b49]"
                        : "border-[#d8cfc2] bg-white text-[#52616b] hover:border-[#be4b49] hover:text-[#be4b49]"
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => {
              const isActive = option.value === activeSort;

              return (
                <Link
                  key={option.value}
                    href={buildReviewsHref({
                      query: activeQuery,
                      type: activeType,
                      sort: option.value,
                    })}
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
          </div>

          <p className="mt-4 text-sm font-semibold text-[#6b7280]">
            {isFiltered ? `검색 결과 ${reviews.length}개` : `전체 ${reviews.length}개`}
          </p>
        </section>

        {paginatedReviews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {paginatedReviews.map((review, index) => {
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
                    <p className="mt-2 line-clamp-1 text-sm text-[#6b7280]">
                      {review.genre.join(", ")}
                    </p>
                    <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[#3f4a54]">
                      {review.summary}
                    </p>
                    <p className="mt-4 text-xs font-semibold text-[#7a8490]">
                      {review.authorName ? (
                        <>
                          <span className="text-[#6d470c]">작성자:</span>{" "}
                          {review.authorName}
                          <span className="mx-2 text-[#d4c9bb]">·</span>
                        </>
                      ) : null}
                      <span className="text-[#9b4a43]">작성일: </span>{" "}
                      {formatFullDate(review.createdAt)}
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
              새 리뷰를 작성하면 이곳에 표시됩니다.
            </p>
          </div>
        )}
        {totalPages > 1 && (
        <div className="mt-10 flex justify-center">
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            getHref={(page: number) => buildReviewsHref({ 
            query: activeQuery, 
            type: activeType, 
            sort: activeSort, 
            page 
          })}
          />
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

function parseType(value: string | string[] | undefined): ReviewTypeFilter {
  const typeValue = Array.isArray(value) ? value[0] : value;

  if (
    typeValue === "movie" ||
    typeValue === "anime" ||
    typeValue === "game" ||
    typeValue === "drama"
  ) {
    return typeValue;
  }

  return "all";
}

function parseSearchValue(value: string | string[] | undefined) {
  const searchValue = Array.isArray(value) ? value[0] : value;

  return searchValue?.trim() ?? "";
}

function filterReviews(
  reviews: Review[],
  query: string,
  type: ReviewTypeFilter,
) {
  const normalizedQuery = query.toLowerCase();

  return reviews.filter((review) => {
    const matchesType = type === "all" || review.type === type;

    if (!matchesType) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      review.title,
      typeLabel(review.type),
      review.summary,
      review.review,
      ...review.genre,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function buildReviewsHref({
  query,
  type,
  sort,
  page,
}: {
  query: string;
  type: ReviewTypeFilter;
  sort: ReviewSort;
  page?: number;
}) {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  if (type !== "all") {
    params.set("type", type);
  }

  if (sort !== "created-desc") {
    params.set("sort", sort);
  }

  if (page && page > 1) {
    params.set("page", page.toString());
  }

  const queryString = params.toString();

  return queryString ? `/reviews?${queryString}` : "/reviews";
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


