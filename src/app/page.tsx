import { ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { reviews, typeLabel } from "@/data/reviews";

export default function Home() {
  const featuredReview = reviews[0];

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            Review Collection
          </Link>
          <Link
            href="/reviews"
            className="rounded-md bg-[#1f2933] px-4 py-2 text-sm font-semibold text-white"
          >
            리뷰 보기
          </Link>
        </nav>

        <div className="grid gap-8 py-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="text-sm font-semibold text-[#be4b49]">
              개인 콘텐츠 아카이브
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-[#17202a] sm:text-5xl">
              본 작품들을 기록하고 다시 꺼내보는 리뷰 컬렉션
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#52616b]">
              영화, 애니, 게임, 드라마의 별점과 감상평을 모아두는 작은
              Next.js 프로젝트입니다.
            </p>
            <Link
              href="/reviews"
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#be4b49] px-5 py-3 text-sm font-bold text-white"
            >
              전체 리뷰 보기
              <ArrowRight size={18} />
            </Link>
          </div>

          <article className="rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="rounded-md bg-[#f3e6d8] px-3 py-1 text-sm font-semibold text-[#8a3b2f]">
                추천 리뷰
              </span>
              <span className="flex items-center gap-1 text-sm font-bold">
                <Star size={16} fill="#f2b84b" color="#f2b84b" />
                {featuredReview.rating}
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-bold">{featuredReview.title}</h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              {typeLabel(featuredReview.type)} ·{" "}
              {featuredReview.genre.join(", ")}
            </p>
            <p className="mt-5 leading-7 text-[#3f4a54]">
              {featuredReview.summary}
            </p>
            <Link
              href={`/reviews/${featuredReview.id}`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#be4b49]"
            >
              자세히 읽기
              <ArrowRight size={16} />
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
