import { Bookmark, ChevronDown, Library, LogIn, Plus, Utensils } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { isAdminUser } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AppNavProps = {
  active?: "home" | "reviews" | "watchlist" | "restaurants" | "admin";
};

export async function AppNav({ active = "home" }: AppNavProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const isAdmin = isAdminUser(user);

  const sectionLabels: Record<string, string> = {
    home: "리뷰 홈",
    watchlist: "기대작 홈",
    restaurants: "맛집리뷰 홈",
    review: "리뷰 홈"
  }
  const activeSectionLabel = sectionLabels[active] || "리뷰 홈";

  const themes: Record<string, {
    brandHover: string;
    icon: string;
    text: string;
    controlHover: string;
    primary: string;
    admin: string;
  }> = {
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
    default: {
      brandHover: "hover:border-[#be4b49]",
      icon: "bg-[#be4b49] group-hover:bg-[#a83f3d]",
      text: "text-[#be4b49]",
      controlHover: "hover:border-[#be4b49] hover:text-[#be4b49]",
      primary: "bg-[#be4b49] hover:bg-[#a83f3d]",
      admin: "bg-[#edf2ef] text-[#2f6f5e]",
    },
  };

// active 값에 맞는 테마를 꺼내고, 없으면 default 테마 적용!
const theme = themes[active] || themes.default;

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/"
        className={`group inline-flex items-center gap-3 rounded-md border border-[#d8cfc2] bg-white px-3 py-2 shadow-sm transition ${theme.brandHover} hover:shadow-md`}
        aria-label="취향보관소 홈"
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-md text-white transition ${theme.icon}`}
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

      <div className="flex flex-wrap items-center gap-2">
        <details className="group relative">
          <summary
            className={`flex cursor-pointer list-none items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#52616b] shadow-sm transition ${theme.controlHover} [&::-webkit-details-marker]:hidden`}
          >
            <Library size={16} />
            {activeSectionLabel}
            <ChevronDown
              size={15}
              className="transition group-open:rotate-180"
            />
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-[#d8cfc2] bg-white p-2 shadow-lg">
            <Link
              href="/"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${
                active === "home"
                  ? "bg-[#fff7f5] text-[#be4b49]"
                  : "text-[#52616b] hover:bg-[#fff7f5] hover:text-[#be4b49]"
              }`}
            >
              <Library size={16} />
              리뷰 홈
            </Link>
            <Link
              href="/watchlist"
              className={`mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${
                active === "watchlist"
                  ? "bg-[#eefaf8] text-[#2f7f7a]"
                  : "text-[#52616b] hover:bg-[#eefaf8] hover:text-[#2f7f7a]"
              }`}
            >
              <Bookmark size={16} />
              기대작 홈
            </Link>
            <Link
              href="/restaurants"
              className={`mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${
                active === "restaurants"
                  ? "bg-[#f7e8cc] text-[#2f7f7a]"
                  : "text-[#52616b] hover:bg-[#f7e8cc] hover:text-[#2f7f7a]"
              }`}
            >
              <Utensils size={16} />
              맛집리뷰 홈
            </Link>
          </div>
        </details>

        {user ? (
          <>
            <Link
              href="/new"
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold text-white shadow-sm transition ${theme.primary}`}
            >
              <Plus size={16} />새 글
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className={`rounded-md border px-3 py-2 text-sm font-bold shadow-sm transition ${
                  active === "admin"
                    ? "border-[#d49a35] bg-[#f3d9a4] text-[#17202a]"
                    : "border-[#e2c17f] bg-[#fff4da] text-[#5c3b09] hover:border-[#d49a35] hover:bg-[#f3d9a4]"
                }`}
              >
                관리자
              </Link>
            ) : (
              <span className="rounded-md border border-[#d8cfc2] bg-white px-3 py-2 text-sm font-bold text-[#52616b] shadow-sm">
                작성자
              </span>
            )}
            <LogoutButton />
          </>
        ) : (
          <Link
            href="/login"
            className={`inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#52616b] shadow-sm transition ${theme.controlHover}`}
          >
            <LogIn size={16} />
            로그인
          </Link>
        )}
      </div>
    </nav>
  );
}
