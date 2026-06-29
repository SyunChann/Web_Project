import { Library, LogIn, Plus } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AppNavProps = {
  active?: "home" | "reviews";
};

export async function AppNav({ active }: AppNavProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/"
        className="group inline-flex items-center gap-3 rounded-md border border-[#d8cfc2] bg-white px-3 py-2 shadow-sm transition hover:border-[#be4b49] hover:shadow-md"
        aria-label="Review Collection 홈"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#be4b49] text-white transition group-hover:bg-[#a83f3d]">
          <Library size={18} />
        </span>
        <span className="grid leading-tight">
          <span className="text-sm font-black text-[#17202a]">Review</span>
          <span className="text-xs font-bold uppercase text-[#be4b49]">
            Collection
          </span>
        </span>
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        {active !== "reviews" ? (
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#be4b49] shadow-sm transition hover:border-[#be4b49] hover:bg-[#fff7f5]"
          >
            리뷰 보기
          </Link>
        ) : (
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-semibold text-[#be4b49] transition hover:bg-[#fff7f5]"
          >
            홈으로
          </Link>
        )}

        {user ? (
          <>
            <Link
              href="/reviews/new"
              className="inline-flex items-center gap-2 rounded-md bg-[#be4b49] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
            >
              <Plus size={16} />새 리뷰
            </Link>
            <span className="rounded-md bg-[#edf2ef] px-3 py-2 text-sm font-bold text-[#2f6f5e]">
              관리자
            </span>
            <LogoutButton />
          </>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#be4b49] hover:text-[#be4b49]"
          >
            <LogIn size={16} />
            로그인
          </Link>
        )}
      </div>
    </nav>
  );
}
