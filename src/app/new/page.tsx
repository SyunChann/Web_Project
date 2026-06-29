import { ArrowLeft, Bookmark, Library } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createReview } from "@/app/actions/reviews";
import { createWatchlistItem } from "@/app/actions/watchlist";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { WatchlistForm } from "@/components/WatchlistForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type NewPostPageProps = {
  searchParams: Promise<{
    type?: string;
  }>;
};

export const metadata = {
  title: "새 글 작성 | 취향보관소",
  description: "리뷰나 기대작을 새로 작성합니다.",
};

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/login");
  }

  const { type } = await searchParams;

  if (type === "review") {
    return (
      <PostFormShell
        backHref="/new"
        backLabel="작성 유형 선택"
        eyebrow="Review"
        title="새 리뷰 작성"
      >
        <ReviewForm action={createReview} submitLabel="리뷰 저장" showSlugField />
      </PostFormShell>
    );
  }

  if (type === "watchlist") {
    return (
      <PostFormShell
        backHref="/new"
        backLabel="작성 유형 선택"
        eyebrow="Watchlist"
        title="새 기대작 작성"
      >
        <WatchlistForm
          action={createWatchlistItem}
          submitLabel="기대작 저장"
          showSlugField
        />
      </PostFormShell>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#be4b49]"
        >
          <ArrowLeft size={17} />홈
        </Link>

        <header className="py-8">
          <p className="text-sm font-semibold text-[#be4b49]">Admin</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">새 글 작성</h1>
          <p className="mt-4 leading-7 text-[#52616b]">
            작성할 콘텐츠 유형을 먼저 선택해 주세요.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/new?type=review"
            className="group rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#be4b49] hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#fde8e7] text-[#be4b49]">
              <Library size={20} />
            </span>
            <h2 className="mt-5 text-xl font-bold text-[#17202a]">리뷰</h2>
            <p className="mt-3 leading-7 text-[#52616b]">
              이미 감상한 작품의 별점, 요약, 감상평을 기록합니다.
            </p>
          </Link>

          <Link
            href="/new?type=watchlist"
            className="group rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#38a39b] hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#e4f4f2] text-[#2f7f7a]">
              <Bookmark size={20} />
            </span>
            <h2 className="mt-5 text-xl font-bold text-[#17202a]">기대작</h2>
            <p className="mt-3 leading-7 text-[#52616b]">
              앞으로 보고 싶은 작품의 기대 이유와 공개 정보를 남깁니다.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}

function PostFormShell({
  backHref,
  backLabel,
  eyebrow,
  title,
  children,
}: {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto w-full max-w-3xl">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#be4b49]"
        >
          <ArrowLeft size={17} />
          {backLabel}
        </Link>

        <header className="py-8">
          <p className="text-sm font-semibold text-[#be4b49]">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
        </header>

        <section className="rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          {children}
        </section>
      </section>
    </main>
  );
}
