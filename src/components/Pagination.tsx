import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  getHref: (page: number) => string;
  theme?: "red" | "green" | "blue";
}

type PageItem = number | "ellipsis-start" | "ellipsis-end";

const themeClasses = {
  red: {
    active: "bg-[#be4b49] text-white shadow-sm",
    hover: "hover:border-[#be4b49]/40 hover:bg-[#fbf5f2] hover:text-[#9b3d3b]",
  },
  green: {
    active: "bg-[#2f7f7a] text-white shadow-sm",
    hover: "hover:border-[#2f7f7a]/40 hover:bg-[#eef8f6] hover:text-[#216864]",
  },
  blue: {
    active: "bg-[#2563eb] text-white shadow-sm",
    hover: "hover:border-[#2563eb]/40 hover:bg-[#eff6ff] hover:text-[#1d4ed8]",
  },
};

function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-start",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-start",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-end",
    totalPages,
  ];
}

export default function Pagination({
  currentPage,
  totalPages,
  getHref,
  theme = "red",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageItems = getPageItems(safeCurrentPage, totalPages);
  const colors = themeClasses[theme];
  const baseButtonClass =
    "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-[#ded4c7] bg-white px-3 text-sm font-bold leading-none text-[#52616b] transition";
  const inactiveClass = `${baseButtonClass} ${colors.hover}`;
  const disabledClass = `${baseButtonClass} cursor-default opacity-40`;
  const activeClass = `${baseButtonClass} ${colors.active} min-w-11 scale-105 border-transparent shadow-md ring-2 ring-[#f3e4d5] ring-offset-2 ring-offset-[#f8f3ed]`;

  return (
    <nav aria-label="페이지 이동">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {safeCurrentPage > 1 ? (
          <Link href={getHref(safeCurrentPage - 1)} className={inactiveClass}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            이전
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            이전
          </span>
        )}

        <div className="flex items-center gap-1.5">
          {pageItems.map((item) =>
            typeof item === "number" ? (
              <Link
                key={item}
                href={getHref(item)}
                className={item === safeCurrentPage ? activeClass : inactiveClass}
                aria-current={item === safeCurrentPage ? "page" : undefined}
                aria-label={
                  item === safeCurrentPage
                    ? `${item}페이지, 현재 페이지`
                    : `${item}페이지로 이동`
                }
              >
                {item}
              </Link>
            ) : (
              <span
                key={item}
                className="flex h-10 min-w-8 items-center justify-center text-sm font-bold text-[#9aa3aa]"
                aria-hidden="true"
              >
                ...
              </span>
            )
          )}
        </div>

        {safeCurrentPage < totalPages ? (
          <Link href={getHref(safeCurrentPage + 1)} className={inactiveClass}>
            다음
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            다음
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
