import { ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { getReviews, typeLabel, typeTheme } from "@/data/reviews";

export default async function Home() {
  const reviews = await getReviews();
  const featuredReview = reviews[0];

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <AppNav active="home" />

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
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#be4b49] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
            >
              전체 리뷰 보기
              <ArrowRight size={18} />
            </Link>
          </div>

          {featuredReview ? (
            <FeaturedReview review={featuredReview} />
          ) : (
            <div className="rounded-lg border border-dashed border-[#cfc5b8] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#be4b49]">
                리뷰 없음
              </p>
              <h2 className="mt-4 text-2xl font-bold">
                Supabase에 첫 리뷰를 추가해 주세요.
              </h2>
              <p className="mt-3 leading-7 text-[#52616b]">
                `reviews` 테이블에 데이터가 들어오면 이 영역에 추천 리뷰가
                표시됩니다.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function FeaturedReview({ review }: { review: Awaited<ReturnType<typeof getReviews>>[number] }) {
  const theme = typeTheme(review.type);

  return (
    <article
      className={`overflow-hidden rounded-lg border border-l-4 border-[#ddd6cc] ${theme.border} bg-white shadow-sm`}
    >
      <Image
        src={review.thumbnail}
        alt={review.thumbnailAlt}
        width={960}
        height={540}
        className="aspect-video w-full object-cover"
        loading="eager"
        fetchPriority="high"
      />
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <span
            className={`rounded-md px-3 py-1 text-sm font-semibold ${theme.badge}`}
          >
            추천 {typeLabel(review.type)}
          </span>
          <span className="flex items-center gap-1 text-sm font-bold">
            <Star size={16} fill="#f2b84b" color="#f2b84b" />
            {review.rating}
          </span>
        </div>
        <h2 className="mt-5 text-2xl font-bold">{review.title}</h2>
        <p className="mt-2 text-sm text-[#6b7280]">
          {typeLabel(review.type)} · {review.genre.join(", ")}
        </p>
        <p className="mt-5 leading-7 text-[#3f4a54]">{review.summary}</p>
        <Link
          href={`/reviews/${review.id}`}
          className={`mt-6 inline-flex items-center gap-2 text-sm font-bold ${theme.text}`}
        >
          자세히 읽기
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
