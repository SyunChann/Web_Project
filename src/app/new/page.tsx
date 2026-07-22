import { ArrowLeft, Bookmark, Library, MapPinned, Utensils, Plane, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createRestaurantReview } from "@/app/actions/restaurants";
import { createReview } from "@/app/actions/reviews";
import { createWatchlistItem } from "@/app/actions/watchlist";
import { DomesticRestaurantsReviewForm } from "@/components/restaurants/domestic/DomesticRestaurantsReviewForm";
import { OverseasRestaurantsReviewForm } from "@/components/restaurants/overseas/OverseasRestaurantsReviewForm";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { TravelForm } from "@/components/travel/TravelForm"
import { WatchlistForm } from "@/components/watchlist/WatchlistForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTravel } from "../actions/travel";
import { MerchandiseReviewForm } from "@/components/merchandise/MerchandiseForm";
import { createMerchandiseReview } from "@/app/actions/merchandise";

type NewPostPageProps = {
  searchParams: Promise<{
    type?: string;
  }>;
};

export const metadata = {
  title: "새 글 작성 | 취향보관소",
  description: "리뷰와 기대작, 맛집리뷰를 새로 작성합니다.",
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
        tone="review"
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
        tone="watchlist"
      >
        <WatchlistForm
          action={createWatchlistItem}
          submitLabel="기대작 저장"
          showSlugField
        />
      </PostFormShell>
    );
  }

  if (type === "restaurants") {
    return (
      <PostFormShell
        backHref="/new"
        backLabel="작성 유형 선택"
        eyebrow="Restaurants"
        title="새 맛집 작성"
        tone="restaurants"
      >
        <DomesticRestaurantsReviewForm
          action={createRestaurantReview}
          submitLabel="맛집 저장"
          scope="domestic"
          showSlugField
        />
      </PostFormShell>
    );
  }

  if (type === "overseas-restaurants") {
    return (
      <PostFormShell
        backHref="/new"
        backLabel="작성 유형 선택"
        eyebrow="Overseas Restaurants"
        title="새 해외 맛집 작성"
        tone="overseas"
      >
        <OverseasRestaurantsReviewForm
          action={createRestaurantReview}
          submitLabel="해외 맛집 저장"
          scope="overseas"
          showSlugField
        />
      </PostFormShell>
    );
  }

  if (type === "travel") {
    return (
      <PostFormShell
        backHref="/new"
        backLabel="작성 유형 선택"
        eyebrow="Travel"
        title="새 해외여행 리뷰 작성"
        tone="travel"
      >
        <TravelForm
          action={createTravel}
          submitLabel="해외여행 리뷰 저장"
          scope="overseas"
          showSlugField
        />
      </PostFormShell>
    );
  }

  if ( type === "merchandise" ){
    return (
      <PostFormShell
        backHref="/new"
        backLabel="작성 유형 선택"
        eyebrow="Merchandise"
        title="새 상품 리뷰 작성"
        tone="merchandise"
      >
        <MerchandiseReviewForm
          action={createMerchandiseReview}
          submitLabel="상품 리뷰 저장"
          showSlugField
        />
      </PostFormShell>
    )
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-10 sm:py-8">
      <section className="mx-auto w-full max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#be4b49]"
        >
          <ArrowLeft size={17} />
          홈
        </Link>

        <header className="py-8">
          <p className="text-sm font-semibold text-[#be4b49]">Admin</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">새 글 작성</h1>
          <p className="mt-4 leading-7 text-[#52616b]">
            작성할 콘텐츠 유형을 먼저 선택해 주세요.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <PostTypeCard
            href="/new?type=review"
            icon={<Library size={20} />}
            title="리뷰"
            description="영화, 애니, 게임, 드라마의 별점, 요약, 감상평을 기록합니다."
            tone="review"
          />
          <PostTypeCard
            href="/new?type=watchlist"
            icon={<Bookmark size={20} />}
            title="기대작"
            description="앞으로 보고 싶은 작품의 기대 이유와 공개 정보를 남깁니다."
            tone="watchlist"
          />
          <PostTypeCard
            href="/new?type=restaurants"
            icon={<Utensils size={20} />}
            title="맛집"
            description="다녀온 맛집의 별점, 요약, 방문평을 기록합니다."
            tone="restaurants"
          />
          <PostTypeCard
            href="/new?type=overseas-restaurants"
            icon={<MapPinned size={20} />}
            title="해외 맛집"
            description="해외에서 다녀온 맛집을 따로 저장하고 지도에 표시합니다."
            tone="overseas"
          />
          <PostTypeCard
            href="/new?type=travel"
            icon={<Plane size={20} />}
            title="해외여행"
            description="해외여행에서 방문한 장소를 기록합니다."
            tone="travel"
          />
          <PostTypeCard
            href="/new?type=merchandise"
            icon={<ShoppingCart size={20} />}
            title="상품리뷰"
            description="사용한 상품의 리뷰를 기록합니다."
            tone="merchandise"
          />
        </div>
      </section>
    </main>
  );
}

function PostTypeCard({
  href,
  icon,
  title,
  description,
  tone,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  tone: "review" | "watchlist" | "restaurants" | "overseas" | "travel" | "merchandise";
}) {
  const theme = {
    review: {
      border: "hover:border-[#be4b49]",
      icon: "bg-[#fde8e7] text-[#be4b49]",
    },
    watchlist: {
      border: "hover:border-[#38a39b]",
      icon: "bg-[#e4f4f2] text-[#2f7f7a]",
    },
    restaurants: {
      border: "hover:border-[#e57632]",
      icon: "bg-[#fdf2e9] text-[#e57632]",
    },
    overseas: {
      border: "hover:border-[#0284c7]",
      icon: "bg-[#e0f2fe] text-[#0284c7]",
    },
    travel: {
      border: "hover:border-[#65a30d]",
      icon: "bg-[#f7fee7] text-[#4d7c0f]",
    },
    merchandise: {
      border: "hover:border-[#9932CC]",
      icon: "bg-[#f5e7fe] text-[#A841DB]",
    }
  }[tone];

  return (
    <Link
      href={href}
      className={`group rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${theme.border}`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-md ${theme.icon}`}
      >
        {icon}
      </span>
      <h2 className="mt-5 text-xl font-bold text-[#17202a]">{title}</h2>
      <p className="mt-3 leading-7 text-[#52616b]">{description}</p>
    </Link>
  );
}

function PostFormShell({
  backHref,
  backLabel,
  eyebrow,
  title,
  children,
  tone,
}: {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  tone: "review" | "watchlist" | "restaurants" | "overseas" | "travel" | "merchandise";
}) {
  const toneColors: Record<string, string> = {
    review: "text-[#be4b49]",
    watchlist: "text-[#2f7f7a]",
    restaurants: "text-[#e57632]",
    overseas: "text-[#0284c7]",
    travel: "text-[#4d7c0f]",
    merchandise: "text-[#A841DB]",
  };
  const accentClass = toneColors[tone] ?? "text-[#be4b49]";
  return (
    <main className="min-h-screen px-4 py-5 sm:px-10 sm:py-8">
      <section className="mx-auto w-full max-w-3xl">
        <Link
          href={backHref}
          className={`inline-flex items-center gap-2 text-sm font-bold ${accentClass}`}
        >
          <ArrowLeft size={17} />
          {backLabel}
        </Link>

        <header className="py-8">
          <p className={`text-sm font-semibold ${accentClass}`}>{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
        </header>

        <section className="rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          {children}
        </section>
      </section>
    </main>
  );
}