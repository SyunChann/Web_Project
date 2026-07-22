import { Search, Star, X } from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { ContentSectionTabs } from "@/components/ContentSectionTabs";
import Pagination from "@/components/Pagination";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import {
  getMerchandiseReviews,
  sortReviews,
  categoryLabel,
  categoryTheme,
  type MerchandiseReview,
  type MerchandiseReviewSort,
} from "@/data/merchandise";

type MerchandiseReviewsPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    sort?: string | string[];
    category?: string | string[];
    page?: string;
  }>;
};


type ReviewCategory = MerchandiseReview["category"];
type ReviewCategoryFilter = ReviewCategory | "all";

const sortOptions: { value: MerchandiseReviewSort; label: string }[] = [
  {
    value: "created-desc",
    label: "작성일 최신순",
  },
  {
    value: "purchased-desc",
    label: "구매일 최신순",
  },
  {
    value: "rating-desc",
    label: "별점 높은순",
  },
];

const typeOptions: { value: ReviewCategoryFilter; label: string }[] = [
  {
    value: "all",
    label: "전체",
  },
  {
    value: "electronics",
    label: "전자제품/가전",
  },
  {
    value: "fashion",
    label: "의류/잡화",
  },
  {
    value: "cosmetics",
    label: "뷰티/화장품",
  },
  {
    value: "supplements",
    label: "영양제/식품",
  },
  {
    value: "lifestyle",
    label: "생활/리빙",
  },
  {
    value: "sports",
    label: "스포츠/레저",
  },
  {
    value: "other",
    label: "기타",
  },
];

export default async function MerchandiseReviewsPage({ searchParams }: MerchandiseReviewsPageProps) {
  const params = await searchParams;
  const activeQuery = parseSearchValue(params?.q);
  const activeSort = parseSort(params?.sort);
  const activeCategory = parseType(params?.category);
  const reviews = sortReviews(
    filterReviews(await getMerchandiseReviews(), activeQuery, activeCategory),
    activeSort,
  );
  const isFiltered = Boolean(activeQuery) || activeCategory !== "all";

  const currentPage = Number(params?.page) || 1;
  const ITEMS_PER_PAGE = 9;

  const filteredReviews = sortReviews(
    filterReviews(await getMerchandiseReviews(), activeQuery, activeCategory),
    activeSort,
  );

  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE);
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <AppNav active="merchandise" />

        <header className="py-10">
          <p className="text-sm font-semibold text-[#a349be]">Merchandise</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">전체 리뷰</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#52616b]">
            상품리뷰 기록을 한곳에서 확인할 수 있습니다.
          </p>
        </header>

        <section className="mb-8 rounded-lg border border-[#ddd6cc] bg-white p-4 shadow-sm">
          <form
            action="/merchandise"
            className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center"
          >
            {activeCategory !== "all" ? (
              <input type="hidden" name="type" value={activeCategory} />
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
                placeholder="상품 검색"
                className="h-11 w-full rounded-md border border-[#d8cfc2] bg-[#fbfaf7] pr-3 pl-10 text-sm font-semibold outline-none transition placeholder:text-[#8a95a1] focus:border-[#8949be] focus:bg-white"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-md bg-[#9249be] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#7d3da8]"
            >
              검색
            </button>
            {isFiltered ? (
              <Link
                href={buildReviewsHref({
                  query: "",
                  category: "all",
                  sort: activeSort,
                })}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#7649be] hover:text-[#7649be]"
              >
                <X size={16} />
                초기화
              </Link>
            ) : null}
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((option) => {
                const isActive = option.value === activeCategory;

                return (
                  <Link
                    key={option.value}
                    href={buildReviewsHref({
                      query: activeQuery,
                      category: option.value,
                      sort: activeSort,
                    })}
                    className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                      isActive
                        ? "border-[#8f49be] bg-[#faf5ff] text-[#8049be]"
                        : "border-[#d8cfc2] bg-white text-[#52616b] hover:border-[#8549be] hover:text-[#8949be]"
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
                      category: activeCategory,
                      sort: option.value,
                    })}
                  className={`rounded-md border px-4 py-2 text-sm font-bold shadow-sm transition ${
                    isActive
                      ? "border-[#9249be] bg-[#9249be] text-white"
                      : "border-[#d8cfc2] bg-white text-[#52616b] hover:border-[#8949be] hover:text-[#7649be]"
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
              const theme = categoryTheme(review.category);
              const isAboveFoldImage = index < 3;
              const isFirstImage = index === 0;

              return (
                <Link
                  key={review.id}
                  href={`/merchandise/${review.id}`}
                  className={`overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme.border} bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
                >
                  <ThumbnailImage
                    src={review.thumbnail}
                    alt={review.thumbnailAlt}
                    title={review.title}
                    label={categoryLabel(review.category)}
                    loading={isAboveFoldImage ? "eager" : "lazy"}
                    fetchPriority={isFirstImage ? "high" : "auto"}
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`rounded-md px-3 py-1 text-xs font-bold ${theme.badge}`}
                      >
                        {categoryLabel(review.category)}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold">
                        <Star size={15} fill="#f2b84b" color="#f2b84b" />
                        {review.rating}
                      </span>
                    </div>
                    <h2 className="mt-5 text-xl font-bold">{review.title}</h2>
                    <p className="mt-2 line-clamp-1 text-sm text-[#6b7280]">
                      {review.tags.join(", ")}
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
            category: activeCategory, 
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

function parseSort(value: string | string[] | undefined): MerchandiseReviewSort {
  const sortValue = Array.isArray(value) ? value[0] : value;

  if (sortValue === "purchased-desc" || sortValue === "rating-desc") {
    return sortValue;
  }

  return "created-desc";
}

function parseType(value: string | string[] | undefined): ReviewCategoryFilter {
  const typeValue = Array.isArray(value) ? value[0] : value;

  if (
    typeValue === "electronics" ||
    typeValue === "fashion" ||
    typeValue === "cosmetics" ||
    typeValue === "supplements" ||
    typeValue === "lifestyle" ||
    typeValue === "sports" ||
    typeValue === "other"
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
  reviews: MerchandiseReview[],
  query: string,
  category: ReviewCategoryFilter,
) {
  const normalizedQuery = query.toLowerCase();

  return reviews.filter((review) => {
    const matchesType = category === "all" || review.category === category;

    if (!matchesType) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      review.title,
      categoryLabel(review.category),
      review.summary,
      review.review,
      ...review.tags,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function buildReviewsHref({
  query,
  category,
  sort,
  page,
}: {
  query: string;
  category: ReviewCategoryFilter;
  sort: MerchandiseReviewSort;
  page?: number;
}) {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  if (category !== "all") {
    params.set("category", category);
  }

  if (sort !== "created-desc") {
    params.set("sort", sort);
  }

  if (page && page > 1) {
    params.set("page", page.toString());
  }

  const queryString = params.toString();

  return queryString ? `/merchandise?${queryString}` : "/merchandise";
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