import { Suspense, type ReactNode } from "react";
import { ArrowRight, Bookmark, Library, MapPinned, Plane, ShoppingCart, Utensils } from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { StatusToast } from "@/components/StatusToast";
import { getRestaurantsReviews } from "@/data/restaurants";
import { getReviews } from "@/data/reviews";
import { getTravels, groupTravelPosts } from "@/data/travel";
import { getWatchItems } from "@/data/watchlist";
import { getMerchandiseReviews } from "@/data/merchandise";

type HomeProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const statusMessage = params?.status === "login"
    ? "\uB85C\uADF8\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4."
    : params?.status === "logout"
      ? "\uB85C\uADF8\uC544\uC6C3\uB418\uC5C8\uC2B5\uB2C8\uB2E4."
      : "";
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      {statusMessage ? <StatusToast key={statusMessage} message={statusMessage} /> : null}
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:gap-10">
        <Suspense fallback={<HomeNavFallback />}>
          <AppNav active="home" />
        </Suspense>

        <header className="max-w-3xl pt-2 sm:pt-6">
          <p className="text-sm font-bold text-[#be4b49]">ARCHIVE HOME</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-[#17202a] sm:text-5xl">
            {"\uB0B4 \uAE30\uB85D\uC744 \uD55C\uB208\uC5D0 \uBD05\uB2C8\uB2E4"}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#52616b]">
            {"\uCF58\uD150\uCE20\uC640 \uB9DB\uC9D1, \uD574\uC678\uC5EC\uD589\uC758 \uCD5C\uC2E0 \uAE30\uB85D\uC744 \uD55C \uACF3\uC5D0\uC11C \uD655\uC778\uD558\uC138\uC694."}
          </p>
        </header>

        <Suspense fallback={<DashboardSkeleton />}>
          <HomeDashboard />
        </Suspense>
      </section>
    </main>
  );
}

async function HomeDashboard() {
  const [reviews, watchItems, restaurants, overseasRestaurants, travels, merchandise] = await Promise.all([
    getReviews(),
    getWatchItems(),
    getRestaurantsReviews(),
    getRestaurantsReviews("overseas"),
    getTravels(),
    getMerchandiseReviews(),
  ]);
  const travelPosts = groupTravelPosts(travels);

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <DashboardSection href="/reviews" icon={<Library size={20} />} label={"\uB9AC\uBDF0"} count={reviews.length} latest={reviews[0]?.title} latestDate={reviews[0]?.createdAt} tone="red" />
      <DashboardSection href="/watchlist/items" icon={<Bookmark size={20} />} label={"\uAE30\uB300\uC791"} count={watchItems.length} latest={watchItems[0]?.title} latestDate={watchItems[0]?.createdAt} tone="teal" />
      <DashboardSection href="/merchandise" icon={<ShoppingCart size={20} />} label={"\uC0C1\uD488"} count={merchandise.length} latest={merchandise[0]?.title} latestDate={merchandise[0]?.createdAt} tone="purple" />
      <DashboardSection href="/restaurants/items" icon={<Utensils size={20} />} label={"\uAD6D\uB0B4 \uB9DB\uC9D1"} count={restaurants.length} latest={restaurants[0]?.title} latestDate={restaurants[0]?.createdAt} tone="orange" />
      <DashboardSection href="/restaurants/items?scope=overseas" icon={<MapPinned size={20} />} label={"\uD574\uC678 \uB9DB\uC9D1"} count={overseasRestaurants.length} latest={overseasRestaurants[0]?.title} latestDate={overseasRestaurants[0]?.createdAt} tone="blue" />
      <DashboardSection href="/travel/items" icon={<Plane size={20} />} label={"\uD574\uC678\uC5EC\uD589"} count={travelPosts.length} latest={travelPosts[0]?.travel.tripTitle ?? travelPosts[0]?.travel.title} latestDate={travelPosts[0]?.travel.createdAt} tone="green" />
    </section>
  );
}

function HomeNavFallback() {
  return <div className="h-12 w-28 animate-pulse rounded-md bg-white shadow-sm" aria-hidden="true" />;
}

function DashboardSkeleton() {
  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="min-h-40 animate-pulse rounded-lg border border-[#eee8df] bg-white sm:min-h-44" />)}
    </section>
  );
}

function DashboardSection({
  href,
  icon,
  label,
  count,
  latest,
  latestDate,
  meta,
  tone,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  count: number;
  latest?: string;
  latestDate?: string;
  meta?: string;
  tone: "red" | "teal" | "orange" | "blue" | "green" | "purple";
}) {
  const themes = {
    red: "text-[#be4b49] hover:border-[#be4b49]",
    teal: "text-[#2f7f7a] hover:border-[#2f7f7a]",
    orange: "text-[#e57632] hover:border-[#e57632]",
    blue: "text-[#0284c7] hover:border-[#0284c7]",
    green: "text-[#4d7c0f] hover:border-[#65a30d]",
    purple: "text-[#9249be] hover:border-[#9249be]",
  } as const;

  return (
    <Link
      href={href}
      className={`group min-h-40 rounded-lg border border-[#ddd6cc] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-44 sm:p-5 ${themes[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span>{icon}</span>
        <ArrowRight size={18} className="text-[#8a95a1] transition group-hover:translate-x-0.5" />
      </div>
      <p className="mt-4 text-sm font-bold sm:mt-6">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#17202a] sm:text-3xl">{count}{"\uAC1C"}</p>
      {meta ? <p className="mt-1 text-xs font-bold text-[#8a95a1]">{meta}</p> : null}
      <div className="mt-3 border-t border-[#eee8df] pt-2 sm:mt-4 sm:pt-3">
        <p className="text-xs font-bold text-[#8a95a1]">{"\uCD5C\uADFC \uAE30\uB85D"}</p>
        <p className="mt-1 line-clamp-1 text-sm font-semibold text-[#52616b]">
          {latest ?? "\uC544\uC9C1 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}
        </p>
        {latestDate ? <p className="mt-1 text-xs text-[#8a95a1]">{formatDate(latestDate)}</p> : null}
      </div>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
