import { ArrowLeft, Bookmark, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import {
  getWatchItems,
  watchStatusLabel,
  watchStatusTheme,
  type WatchItem,
} from "@/data/watchlist";
import { typeLabel } from "@/data/reviews";
import Pagination from "@/components/Pagination";

export const metadata = {
  title: "전체 기대작 | 취향보관소",
  description: "앞으로 보고 싶은 기대작 전체 목록",
};

type WatchlistItemsPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
};

type WatchStatus = WatchItem["status"];
type WatchStatusFilter = WatchStatus | "all";

const statusOptions: { value: WatchStatusFilter; label: string }[] = [
  {
    value: "all",
    label: "전체",
  },
  {
    value: "waiting",
    label: "기대중",
  },
  {
    value: "watching",
    label: "보는 중",
  },
  {
    value: "paused",
    label: "보류",
  },
];

export default async function WatchlistItemsPage({
  searchParams,
}: WatchlistItemsPageProps) {
  const params = await searchParams;
  const activeQuery = parseSearchValue(params?.q);
  const activeStatus = parseStatus(params?.status);
  const items = filterWatchItems(await getWatchItems(), activeQuery, activeStatus);
  const isFiltered = Boolean(activeQuery) || activeStatus !== "all";

  const currentPage = Number(params?.page) || 1;
  const allFilteredItems = filterWatchItems(await getWatchItems(), activeQuery, activeStatus);

  const itemsPerPage = 9;
  const totalPages = Math.ceil(allFilteredItems.length / itemsPerPage);
  const paginatedItems = allFilteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-5xl">
        <AppNav active="watchlist" />

        <header className="py-10">
          <Link
            href="/watchlist"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#2f7f7a]"
          >
            <ArrowLeft size={17} />
            기대작 홈
          </Link>
          <p className="mt-8 text-sm font-semibold text-[#2f7f7a]">Watchlist</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">전체 기대작</h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#52616b]">
            아직 감상하지 않았지만 기억해두고 싶은 작품을 모아둔 목록입니다.
          </p>
        </header>

        <section className="mb-8 rounded-lg border border-[#d7e7e4] bg-white p-4 shadow-sm">
          <form
            action="/watchlist/items"
            className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center"
          >
            {activeStatus !== "all" ? (
              <input type="hidden" name="status" value={activeStatus} />
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
                placeholder="제목, 장르, 기대 이유 검색"
                className="h-11 w-full rounded-md border border-[#c8dedb] bg-[#f7fcfb] pr-3 pl-10 text-sm font-semibold outline-none transition placeholder:text-[#8a95a1] focus:border-[#38a39b] focus:bg-white"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-md bg-[#2f7f7a] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#276a66]"
            >
              검색
            </button>
            {isFiltered ? (
              <Link
                href="/watchlist/items"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#c8dedb] bg-white px-4 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#38a39b] hover:text-[#2f7f7a]"
              >
                <X size={16} />
                초기화
              </Link>
            ) : null}
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const isActive = option.value === activeStatus;

              return (
                <Link
                  key={option.value}
                  href={buildWatchlistHref({
                    query: activeQuery,
                    status: option.value,
                  })}
                  className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                    isActive
                      ? "border-[#38a39b] bg-[#e4f4f2] text-[#2f7f7a]"
                      : "border-[#c8dedb] bg-white text-[#52616b] hover:border-[#38a39b] hover:text-[#2f7f7a]"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>

          <p className="mt-4 text-sm font-semibold text-[#6b7280]">
            {isFiltered ? `검색 결과 ${items.length}개` : `전체 ${items.length}개`}
          </p>
        </section>

        {paginatedItems.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {paginatedItems.map((item) => (
                <WatchItemCard key={item.id} item={item} />
              ))}
            </div>
            
            {/* Pagination 컴포넌트 추가 */}
            <div className="mt-12">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                getHref={(page) =>
                  buildWatchlistHref({
                    query: activeQuery,
                    status: activeStatus,
                    page,
                  })
                }
                theme="green"
              />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-[#eadcc7] bg-[#fffdf8] p-8 text-center shadow-sm">
            <Bookmark className="mx-auto text-[#38a39b]" size={24} />
            <h2 className="mt-4 text-lg font-bold text-[#17202a]">
              아직 작성된 기대작이 없습니다
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#52616b]">
              기대작을 추가하면 전체 목록에서 한 번에 확인할 수 있습니다.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function WatchItemCard({ item }: { item: WatchItem }) {
  return (
    <Link
      href={`/watchlist/${item.id}`}
      className="block overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] border-l-[#38a39b] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <Image
        src={item.thumbnail}
        alt={item.thumbnailAlt}
        width={960}
        height={540}
        className="aspect-video w-full object-cover"
        loading="lazy"
      />
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-md px-3 py-1 text-xs font-bold ${watchStatusTheme(item.status)}`}>
            {watchStatusLabel(item.status)}
          </span>
          <Bookmark size={16} className="text-[#38a39b]" />
        </div>
        <h2 className="mt-5 text-lg font-bold text-[#17202a]">{item.title}</h2>
        <p className="mt-2 text-sm font-semibold text-[#2f7f7a]">
          공개: {item.releaseLabel}
        </p>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#3f4a54]">
          {item.reason}
        </p>
        <p className="mt-4 text-xs font-semibold text-[#7a8490]">
          {item.authorName ? (
            <>
              <span className="text-[#6d470c]">작성자:</span> {item.authorName}
            </>
          ) : null}
        </p>
      </div>
    </Link>
  );
}

function parseStatus(value: string | string[] | undefined): WatchStatusFilter {
  const statusValue = Array.isArray(value) ? value[0] : value;

  if (
    statusValue === "waiting" ||
    statusValue === "watching" ||
    statusValue === "paused"
  ) {
    return statusValue;
  }

  return "all";
}

function parseSearchValue(value: string | string[] | undefined) {
  const searchValue = Array.isArray(value) ? value[0] : value;

  return searchValue?.trim() ?? "";
}

function filterWatchItems(
  items: WatchItem[],
  query: string,
  status: WatchStatusFilter,
) {
  const normalizedQuery = query.toLowerCase();

  return items.filter((item) => {
    const matchesStatus = status === "all" || item.status === status;

    if (!matchesStatus) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      item.title,
      typeLabel(item.type),
      watchStatusLabel(item.status),
      item.releaseLabel,
      item.reason,
      ...item.genre,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function buildWatchlistHref({
  query,
  status,
  page,
}: {
  query: string;
  status: WatchStatusFilter;
  page?: number;
}) {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  if (status !== "all") {
    params.set("status", status);
  }

  if (page && page > 1) {
    params.set("page", page.toString());
  }
  const queryString = params.toString();

  return queryString ? `/watchlist/items?${queryString}` : "/watchlist/items";
}
