import { MapPinned, Search, Star, X } from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import {
  categoryLabel,
  categoryTheme,
  getTravels,
  sortTravels,
  type Travel,
  type ReviewSort,
} from "@/data/travel";
import Pagination from "@/components/Pagination";

type TravelsPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    sort?: string | string[];
    category?: string | string[];
    scope?: string | string[];
    page?: string | string[];
  }>;
};

type ReviewCategory = Travel["category"];
type ReviewCategoryFilter = ReviewCategory | "all";

const sortOptions: { value: ReviewSort; label: string }[] = [
  {
    value: "created-desc",
    label: "작성일 최신순",
  },
  {
    value: "rating-desc",
    label: "별점 높은순",
  },
];

const categoryOptions: { value: ReviewCategoryFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "korea", label: "한국" },
  { value: "japan", label: "일본" },
  { value: "china", label: "중국" },
  { value: "other", label: "기타" },
];

export default async function TravelsPage({
  searchParams,
}: TravelsPageProps) {
  const params = await searchParams;
  const activeQuery = parseSearchValue(params?.q);
  const activeSort = parseSort(params?.sort);
  const activeScope = parseScope(params?.scope);
  const isOverseas = true;
  const activeCategory = "all";
  const accentText = "text-[#4d7c0f]";
  const accentBorder = "border-[#65a30d]";
  const focusBorder = "focus:border-[#65a30d]";
  const accentBg = "bg-[#65a30d]";
  const accentHoverBg = "hover:bg-[#4d7c0f]";
  const softActive = "border-[#65a30d] bg-[#f7fee7] text-[#3f6212]";
  const softHover = "hover:border-[#65a30d] hover:text-[#4d7c0f]";
  const cardBorder = "border-l-[#65a30d]";
  const badgeClass = "bg-[#f7fee7] text-[#3f6212]";
  const travels = sortTravels(
    filterReviews(
      await getTravels(activeScope),
      activeQuery,
      activeCategory,
    ),
    activeSort,
  );
  const isFiltered = Boolean(activeQuery) || activeCategory !== "all";

const currentPage = Number(params?.page) || 1;
  const itemsPerPage = 9;
  const totalPages = Math.ceil(travels.length / itemsPerPage);
  
  // 전체 travels 배열에서 현재 페이지에 보여줄 9개만 잘라냅니다.
  const paginatedTravels = travels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-10 sm:py-8">
      <section className="mx-auto w-full max-w-5xl">
        <AppNav active="travel" />

        <header className="py-10">
          <p className={`text-sm font-semibold ${accentText}`}>
            {isOverseas ? "Overseas Restaurant" : "Restaurant"}
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            {isOverseas ? "여행리뷰 목록" : "전체 여행리뷰"}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#52616b]">
            {isOverseas
              ? "지도에 등록된 여행리뷰를 목록으로 확인합니다."
              : "여행의 기록을 한곳에서 확인할 수 있습니다."}
          </p>
          {isOverseas ? (
            <Link
              href="/travel/map"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#65a30d] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#4d7c0f]"
            >
              <MapPinned size={17} />
              지도로 보기
            </Link>
          ) : null}
        </header>

        <section className="mb-8 rounded-lg border border-[#ddd6cc] bg-white p-4 shadow-sm">
          <form
            action="/travel/items"
            className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center"
          >
            {isOverseas ? (
              <input type="hidden" name="scope" value="overseas" />
            ) : null}
            {activeCategory !== "all" ? (
              <input type="hidden" name="category" value={activeCategory} />
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
                placeholder="제목, 상호명, 요약 검색"
                className={`h-11 w-full rounded-md border border-[#d8cfc2] bg-[#fbfaf7] pr-3 pl-10 text-sm font-semibold outline-none transition placeholder:text-[#8a95a1] ${focusBorder} focus:bg-white`}
              />
            </label>
            <button
              type="submit"
              className={`inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-bold text-white shadow-sm transition ${accentBg} ${accentHoverBg}`}
            >
              검색
            </button>
            {isFiltered ? (
              <Link
                href={buildReviewsHref({
                  query: "",
                  category: "all",
                  sort: activeSort,
                  scope: activeScope,
                })}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 text-sm font-bold text-[#52616b] shadow-sm transition ${softHover}`}
              >
                <X size={16} />
                초기화
              </Link>
            ) : null}
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {!isOverseas ? (
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((option) => {
                  const isActive = option.value === activeCategory;

                  return (
                    <Link
                      key={option.value}
                      href={buildReviewsHref({
                        query: activeQuery,
                        category: option.value,
                        sort: activeSort,
                        scope: activeScope,
                      })}
                      className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                        isActive
                          ? softActive
                          : `border-[#d8cfc2] bg-white text-[#52616b] ${softHover}`
                      }`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm font-semibold text-[#6b7280]">
                여행리뷰는 Google Maps 장소 기준으로 정리됩니다.
              </div>
            )}

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
                      scope: activeScope,
                    })}
                    className={`rounded-md border px-4 py-2 text-sm font-bold shadow-sm transition ${
                      isActive
                        ? `${accentBorder} ${accentBg} text-white`
                        : `border-[#d8cfc2] bg-white text-[#52616b] ${softHover}`
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-[#6b7280]">
            {isFiltered
              ? `검색 결과 ${travels.length}개`
              : `전체 ${travels.length}개`}
          </p>
        </section>

        {travels.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {travels.map((review, index) => {
              const theme = categoryTheme(review.category);
              const isAboveFoldImage = index < 3;
              const isFirstImage = index === 0;
              const title = isOverseas ? review.storeName : review.title;

              return (
                <Link
                  key={review.id}
                  href={`/travel/${review.id}`}
                  className={`overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${isOverseas ? cardBorder : theme.border} bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
                >
                  <ThumbnailImage
                    src={review.thumbnail}
                    alt={review.thumbnailAlt}
                    title={title}
                    label={isOverseas ? "해외 맛집" : categoryLabel(review.category)}
                    loading={isAboveFoldImage ? "eager" : "lazy"}
                    fetchPriority={isFirstImage ? "high" : "auto"}
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`rounded-md px-3 py-1 text-xs font-bold ${isOverseas ? badgeClass : theme.badge}`}
                      >
                        {isOverseas ? "해외 맛집" : categoryLabel(review.category)}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold">
                        <Star size={15} fill="#f2b84b" color="#f2b84b" />
                        {review.rating}
                      </span>
                    </div>
                    <h2 className="mt-5 text-xl font-bold">{title}</h2>
                    {review.address ? (
                      <p className="mt-2 line-clamp-1 text-sm text-[#6b7280]">
                        {review.address}
                      </p>
                    ) : null}
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
                      <span className="text-[#9b4a43]">작성일:</span>{" "}
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
      </section>
    </main>
  );
}

function parseSort(value: string | string[] | undefined): ReviewSort {
  const sortValue = Array.isArray(value) ? value[0] : value;

  if (sortValue === "rating-desc") {
    return sortValue;
  }

  return "created-desc";
}

function parseCategory(value: string | string[] | undefined): ReviewCategoryFilter {
  const categoryValue = Array.isArray(value) ? value[0] : value;

  if (
    categoryValue === "korea" ||
    categoryValue === "japan" ||
    categoryValue === "china" ||

    categoryValue === "other"
  ) {
    return categoryValue;
  }

  return "all";
}

function parseScope(value: string | string[] | undefined): Travel["scope"] {
  const scopeValue = Array.isArray(value) ? value[0] : value;

  return scopeValue === "overseas" ? "overseas" : "domestic";
}

function parseSearchValue(value: string | string[] | undefined) {
  const searchValue = Array.isArray(value) ? value[0] : value;

  return searchValue?.trim() ?? "";
}

function filterReviews(
  reviews: Travel[],
  query: string,
  category: ReviewCategoryFilter,
) {
  const normalizedQuery = query.toLowerCase();

  return reviews.filter((review) => {
    const matchesCategory = category === "all" || review.category === category;

    if (!matchesCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      review.title,
      review.storeName,
      categoryLabel(review.category),
      review.address,
      review.summary,
      review.review,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function buildReviewsHref({
  query,
  category,
  sort,
  scope,
}: {
  query: string;
  category: ReviewCategoryFilter;
  sort: ReviewSort;
  scope: Travel["scope"];
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

  if (scope === "overseas") {
    params.set("scope", "overseas");
  }

  const queryString = params.toString();

  return queryString ? `/travel/items?${queryString}` : "/travel/items";
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
