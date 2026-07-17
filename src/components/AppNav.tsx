import type { ReactNode } from "react";
import {
  BadgeDollarSign,
  Bookmark,
  ChevronDown,
  Ellipsis,
  Home,
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
    | "domestic-restaurants-map"
    | "overseas-restaurants-map"
    | "travel"
    | "restaurant-map"
    | "prices"
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
    "domestic-restaurants-map": "국내 맛집리뷰 지도",
    "overseas-restaurants-map": "해외 맛집리뷰 지도",
    travel: "해외여행",
    "restaurant-map": "해외 맛집리뷰 지도",
    prices: "가격추적",
    admin: "관리자",
  };
  const activeSectionLabel = sectionLabels[active] || "리뷰 홈";

  const isContentSection = active === "reviews" || active === "watchlist";
  const isRestaurantSection =
    active === "domestic-restaurants-map" ||
    active === "overseas-restaurants-map" ||
    active === "restaurant-map";

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
    "domestic-restaurants-map": {
      brandHover: "hover:border-[#e57632]",
      icon: "bg-[#e57632] group-hover:bg-[#c85a17]",
      text: "text-[#e57632]",
      controlHover: "hover:border-[#e57632] hover:text-[#e57632]",
      primary: "bg-[#e57632] hover:bg-[#c85a17]",
      admin: "bg-[#fdf2e9] text-[#e57632]",
    },
    "overseas-restaurants-map": {
      brandHover: "hover:border-[#0284c7]",
      icon: "bg-[#0284c7] group-hover:bg-[#0369a1]",
      text: "text-[#0284c7]",
      controlHover: "hover:border-[#0284c7] hover:text-[#0284c7]",
      primary: "bg-[#0284c7] hover:bg-[#0369a1]",
      admin: "bg-[#e0f2fe] text-[#075985]",
    },
    travel: { brandHover: "hover:border-[#65a30d]", icon: "bg-[#65a30d] group-hover:bg-[#4d7c0f]", text: "text-[#4d7c0f]", controlHover: "hover:border-[#65a30d] hover:text-[#4d7c0f]", primary: "bg-[#65a30d] hover:bg-[#4d7c0f]", admin: "bg-[#f7fee7] text-[#3f6212]" },
    prices: { brandHover: "hover:border-[#a16207]", icon: "bg-[#a16207] group-hover:bg-[#854d0e]", text: "text-[#a16207]", controlHover: "hover:border-[#a16207] hover:text-[#a16207]", primary: "bg-[#a16207] hover:bg-[#854d0e]", admin: "bg-[#fff7e6] text-[#a16207]" },
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
      <div className="flex items-center justify-between sm:hidden">
        <Link
          href="/"
          className={`group inline-flex items-center rounded-md border border-[#d8cfc2] bg-white p-2 shadow-sm transition ${theme.brandHover} hover:shadow-md`}
          aria-label="홈"
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-md text-white transition ${theme.icon}`}
          >
            <Library size={18} />
          </span>
        </Link>

        {user ? (
          <details className="group relative">
            <summary
              className={`flex cursor-pointer list-none items-center justify-center rounded-md border border-[#d8cfc2] bg-white p-2 text-[#52616b] shadow-sm transition ${theme.controlHover} [&::-webkit-details-marker]:hidden`}
              aria-label="계정 메뉴"
            >
              <Ellipsis size={20} />
            </summary>
            <div className="absolute right-0 z-30 mt-2 flex w-36 flex-col gap-1 rounded-lg border border-[#d8cfc2] bg-white p-2 shadow-lg">
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="rounded-md px-3 py-2 text-sm font-bold text-[#5c3b09] hover:bg-[#fff4da]"
                >
                  관리자
                </Link>
              ) : null}
              <LogoutButton />
            </div>
          </details>
        ) : (
          <Link
            href="/login"
            className={`flex items-center justify-center rounded-md border border-[#d8cfc2] bg-white p-2 text-[#52616b] shadow-sm transition ${theme.controlHover}`}
            aria-label="로그인"
          >
            <LogIn size={19} />
          </Link>
        )}
      </div>

      <Link
        href="/"
        className={`group hidden self-start items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-2.5 py-2 shadow-sm transition sm:inline-flex sm:gap-3 sm:px-3 ${theme.brandHover} hover:shadow-md`}
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

      <div className="hidden w-full flex-wrap items-center gap-2 sm:flex sm:w-auto sm:justify-end">
        <details className="group relative">
          <summary
            className={`flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-[#d8cfc2] bg-white px-3 py-2 text-sm font-bold text-[#52616b] shadow-sm transition sm:gap-2 sm:px-4 ${theme.controlHover} [&::-webkit-details-marker]:hidden`}
          >
            <Library size={16} />
            {active === "home"
              ? "\uD648"
              : isContentSection
                ? "\uCF58\uD150\uCE20"
                : isRestaurantSection
                  ? "\uB9DB\uC9D1\uB9AC\uBDF0"
                  : activeSectionLabel}
            <ChevronDown
              size={15}
              className="transition group-open:rotate-180"
            />
          </summary>
          <div className="absolute left-0 z-30 mt-2 w-52 overflow-hidden rounded-lg border border-[#d8cfc2] bg-white p-2 shadow-lg sm:right-0 sm:left-auto">
            <NavMenuLink
              href="/reviews"
              active={isContentSection}
              icon={<Library size={16} />}
              label={"\uCF58\uD150\uCE20"}
              activeClass="bg-[#fff7f5] text-[#be4b49]"
              hoverClass="hover:bg-[#fff7f5] hover:text-[#be4b49]"
            />
            <NavMenuLink
              href="/"
              hidden
              active={active === "home"}
              icon={<Library size={16} />}
              label="리뷰 홈"
              activeClass="bg-[#fff7f5] text-[#be4b49]"
              hoverClass="hover:bg-[#fff7f5] hover:text-[#be4b49]"
            />
            <NavMenuLink
              href="/watchlist"
              hidden
              active={active === "watchlist"}
              icon={<Bookmark size={16} />}
              label="기대작"
              activeClass="bg-[#eefaf8] text-[#2f7f7a]"
              hoverClass="hover:bg-[#eefaf8] hover:text-[#2f7f7a]"
            />
            <NavMenuLink
              href="/restaurants/items"
              active={isRestaurantSection}
              icon={<Utensils size={16} />}
              label={"\uB9DB\uC9D1\uB9AC\uBDF0"}
              activeClass="bg-[#fdf2e9] text-[#e57632]"
              hoverClass="hover:bg-[#fdf2e9] hover:text-[#e57632]"
            />
            <NavMenuLink
              href="/restaurants/map"
              hidden
              active={active === "overseas-restaurants-map"}
              icon={<MapPinned size={16} />}
              label="해외 맛집리뷰 지도"
              activeClass="bg-[#e0f2fe] text-[#075985]"
              hoverClass="hover:bg-[#e0f2fe] hover:text-[#0284c7]"
            />
            <NavMenuLink href="/travel/items" active={active === "travel"} icon={<MapPinned size={16} />} label="해외여행" activeClass="bg-[#f7fee7] text-[#3f6212]" hoverClass="hover:bg-[#f7fee7] hover:text-[#4d7c0f]" />
            <NavMenuLink href="/prices" active={active === "prices"} icon={<BadgeDollarSign size={16} />} label="가격추적" activeClass="bg-[#fff7e6] text-[#a16207]" hoverClass="hover:bg-[#fff7e6] hover:text-[#a16207]" />
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

      <MobileBottomNav active={active} />
    </nav>
  );
}

function MobileBottomNav({ active }: { active: NonNullable<AppNavProps["active"]> }) {
  const isContentSection = active === "reviews" || active === "watchlist";
  
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#d8cfc2] bg-white/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_16px_rgba(23,32,42,0.08)] backdrop-blur sm:hidden">
      {[
        { href: "/", label: "\uD648", icon: <Home size={19} />, active: active === "home" },
        { href: "/reviews", label: "\uCF58\uD150\uCE20", icon: <Library size={19} />, active: isContentSection },
        { href: "/restaurants/items", label: "\uB9DB\uC9D1\uB9AC\uBDF0", icon: <Utensils size={19} />, active: active === "domestic-restaurants-map" || active === "overseas-restaurants-map" },
        { href: "/travel/items", label: "\uD574\uC678\uC5EC\uD589", icon: <MapPinned size={19} />, active: active === "travel" },
        { href: "/new", label: "\uC0C8\uAE00", icon: <Plus size={20} />, active: false, primary: true },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] font-bold transition ${
            item.primary
              ? "bg-[#be4b49] text-white"
              : item.active
                ? "bg-[#fff1ef] text-[#be4b49]"
                : "text-[#52616b] hover:bg-[#f7f3ed]"
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  );
}

function NavMenuLink({
  href,
  active,
  icon,
  label,
  activeClass,
  hoverClass,
  hidden,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  activeClass: string;
  hoverClass: string;
  hidden?: boolean;
}) {
  if (hidden) {
    return null;
  }

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
