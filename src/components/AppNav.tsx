import type { ReactNode } from "react";
import {
  Bookmark,
  ChevronDown,
  Library,
  LogIn,
  MapPinned,
  Plus,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { isAdminUser } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AppNavProps = {
  active?:
    | "home"
    | "reviews"
    | "watchlist"
    | "restaurants"
    | "travel"
    | "restaurant-map"
    | "admin";
};

export async function AppNav({ active = "home" }: AppNavProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const isAdmin = isAdminUser(user);

  const sectionLabels: Record<string, string> = {
    home: "리뷰",
    reviews: "리뷰 목록",
    watchlist: "기대작",
    restaurants: "맛집리뷰",
    travel: "해외여행",
    "restaurant-map": "해외 맛집리뷰 지도",
    admin: "관리자",
  };
  const activeSectionLabel = sectionLabels[active] || "리뷰 홈";

  const themes: Record<
    string,
    {
      brandHover: string;
      icon: string;
      text: string;
      controlHover: string;
      primary: string;
      admin: string;
    }
  > = {
    watchlist: {
      brandHover: "hover:border-[#2f7f7a]",
      icon: "bg-[#2f7f7a] group-hover:bg-[#276a66]",
      text: "text-[#2f7f7a]",
      controlHover: "hover:border-[#2f7f7a] hover:text-[#2f7f7a]",
      primary: "bg-[#2f7f7a] hover:bg-[#276a66]",
      admin: "bg-[#e4f4f2] text-[#2f7f7a]",
    },
    restaurants: {
      brandHover: "hover:border-[#e57632]",
      icon: "bg-[#e57632] group-hover:bg-[#c85a17]",
      text: "text-[#e57632]",
      controlHover: "hover:border-[#e57632] hover:text-[#e57632]",
      primary: "bg-[#e57632] hover:bg-[#c85a17]",
      admin: "bg-[#fdf2e9] text-[#e57632]",
    },
    "restaurant-map": {
      brandHover: "hover:border-[#0284c7]",
      icon: "bg-[#0284c7] group-hover:bg-[#0369a1]",
      text: "text-[#0284c7]",
      controlHover: "hover:border-[#0284c7] hover:text-[#0284c7]",
      primary: "bg-[#0284c7] hover:bg-[#0369a1]",
      admin: "bg-[#e0f2fe] text-[#075985]",
    },
    travel: { brandHover: "hover:border-[#65a30d]", icon: "bg-[#65a30d] group-hover:bg-[#4d7c0f]", text: "text-[#4d7c0f]", controlHover: "hover:border-[#65a30d] hover:text-[#4d7c0f]", primary: "bg-[#65a30d] hover:bg-[#4d7c0f]", admin: "bg-[#f7fee7] text-[#3f6212]" },
    default: {
      brandHover: "hover:border-[#be4b49]",
      icon: "bg-[#be4b49] group-hover:bg-[#a83f3d]",
      text: "text-[#be4b49]",
      controlHover: "hover:border-[#be4b49] hover:text-[#be4b49]",
      primary: "bg-[#be4b49] hover:bg-[#a83f3d]",
      admin: "bg-[#edf2ef] text-[#2f6f5e]",
    },
  };

  const theme = themes[active] || themes.default;

  return (
    <nav className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <Link
        href="/"
        className={`group inline-flex self-start items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-2.5 py-2 shadow-sm transition sm:gap-3 sm:px-3 ${theme.brandHover} hover:shadow-md`}
        aria-label="취향보관소"
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md text-white transition sm:h-9 sm:w-9 ${theme.icon}`}
        >
          <Library size={18} />
        </span>
        <span className="grid leading-tight">
          <span className="text-sm font-black text-[#17202a]">취향</span>
          <span className={`text-xs font-bold uppercase ${theme.text}`}>
            보관소
          </span>
        </span>
      </Link>

      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        <details className="group relative">
          <summary
            className={`flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-[#d8cfc2] bg-white px-3 py-2 text-sm font-bold text-[#52616b] shadow-sm transition sm:gap-2 sm:px-4 ${theme.controlHover} [&::-webkit-details-marker]:hidden`}
          >
            <Library size={16} />
            {activeSectionLabel}
            <ChevronDown
              size={15}
              className="transition group-open:rotate-180"
            />
          </summary>
          <div className="absolute left-0 z-30 mt-2 w-52 overflow-hidden rounded-lg border border-[#d8cfc2] bg-white p-2 shadow-lg sm:right-0 sm:left-auto">
            <NavMenuLink
              href="/"
              active={active === "home"}
              icon={<Library size={16} />}
              label="리뷰 홈"
              activeClass="bg-[#fff7f5] text-[#be4b49]"
              hoverClass="hover:bg-[#fff7f5] hover:text-[#be4b49]"
            />
            <NavMenuLink
              href="/watchlist"
              active={active === "watchlist"}
              icon={<Bookmark size={16} />}
              label="기대작"
              activeClass="bg-[#eefaf8] text-[#2f7f7a]"
              hoverClass="hover:bg-[#eefaf8] hover:text-[#2f7f7a]"
            />
            <NavMenuLink
              href="/restaurants"
              active={active === "restaurants"}
              icon={<Utensils size={16} />}
              label="맛집리뷰 홈"
              activeClass="bg-[#fdf2e9] text-[#e57632]"
              hoverClass="hover:bg-[#fdf2e9] hover:text-[#e57632]"
            />
            <NavMenuLink
              href="/restaurants/map"
              active={active === "restaurant-map"}
              icon={<MapPinned size={16} />}
              label="해외 맛집리뷰 지도"
              activeClass="bg-[#e0f2fe] text-[#075985]"
              hoverClass="hover:bg-[#e0f2fe] hover:text-[#0284c7]"
            />
            <NavMenuLink href="/travel" active={active === "travel"} icon={<MapPinned size={16} />} label="해외여행" activeClass="bg-[#f7fee7] text-[#3f6212]" hoverClass="hover:bg-[#f7fee7] hover:text-[#4d7c0f]" />
          </div>
        </details>

        {user ? (
          <>
            <Link
              href="/new"
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold text-white shadow-sm transition sm:gap-2 sm:px-4 ${theme.primary}`}
            >
              <Plus size={16} />
              새 글
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className={`rounded-md border px-2.5 py-2 text-sm font-bold shadow-sm transition sm:px-3 ${
                  active === "admin"
                    ? "border-[#d49a35] bg-[#f3d9a4] text-[#17202a]"
                    : "border-[#e2c17f] bg-[#fff4da] text-[#5c3b09] hover:border-[#d49a35] hover:bg-[#f3d9a4]"
                }`}
              >
                관리자
              </Link>
            ) : (
              <span className="rounded-md border border-[#d8cfc2] bg-white px-2.5 py-2 text-sm font-bold text-[#52616b] shadow-sm sm:px-3">
                작성자
              </span>
            )}
            <LogoutButton />
          </>
        ) : (
          <Link
            href="/login"
            className={`inline-flex items-center gap-1.5 rounded-md border border-[#d8cfc2] bg-white px-3 py-2 text-sm font-bold text-[#52616b] shadow-sm transition sm:gap-2 sm:px-4 ${theme.controlHover}`}
          >
            <LogIn size={16} />
            로그인
          </Link>
        )}
      </div>
    </nav>
  );
}

function NavMenuLink({
  href,
  active,
  icon,
  label,
  activeClass,
  hoverClass,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  activeClass: string;
  hoverClass: string;
}) {
  return (
    <Link
      href={href}
      className={`mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${
        active ? activeClass : `text-[#52616b] ${hoverClass}`
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
