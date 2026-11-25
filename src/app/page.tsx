import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeRecentEntries } from "@/components/home/HomeRecentEntries";
import { HomeAirportInfo, HomeEditorPick, HomeExchangeRates, HomeRatesSkeleton, HomeAirportSkeleton, HomeEditorSkeleton } from "@/components/home/HomeQuickInfo";
import { StatusToast } from "@/components/StatusToast";
import { getHomeFeed } from "@/data/homeFeed";
import { homeSearchTitle, siteDescription, siteName, websiteStructuredData } from "@/lib/siteIdentity";
import styles from "@/components/home/Home.module.css";

export const metadata: Metadata = {
  title: homeSearchTitle,
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ko_KR", siteName, title: siteName, description: siteDescription, url: "/", images: [{ url: "/share/home-v3", width: 1200, height: 630, alt: "취향 보관소 — 콘텐츠 · 맛집 · 여행 · 술" }] },
};

type HomeProps = { searchParams?: Promise<{ status?: string }> };

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const message = params?.status === "login" ? "로그인되었습니다." : params?.status === "logout" ? "로그아웃되었습니다." : "";
  return <main className="home-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData()).replace(/</g, "\\u003c") }} />
    {message ? <StatusToast key={message} message={message} /> : null}
        <header className={styles.intro}><h1>좋아한 것들의 기록.</h1><p>보고, 맛보고, 다녀온 순간을 차곡차곡.</p></header>
        <aside className={styles.utilities} aria-label="추천과 생활 정보"><Suspense fallback={<HomeEditorSkeleton />}><HomeEditorPick /></Suspense><Suspense fallback={<HomeAirportSkeleton />}><HomeAirportInfo /></Suspense><Suspense fallback={<HomeRatesSkeleton />}><HomeExchangeRates /></Suspense></aside>
        <div className={styles.content} id="home-records"><Suspense fallback={<HomeFeedSkeleton />}><RecentFeed /></Suspense></div>
        <footer className={styles.footer}><span>취향은 기록으로 남습니다.</span><span>콘텐츠 · 맛집 · 여행 · 술</span></footer>
  </main>;
}
async function RecentFeed() { const feed = await getHomeFeed(); return <HomeRecentEntries entries={feed.entries} partial={feed.partial} />; }
function HomeFeedSkeleton() {
  return <div className={styles.recordsGrid}>{["최근 남긴 기록", "다른 취향 둘러보기"].map((title) => <section key={title} className={styles.recent} aria-busy="true" aria-label={`${title} 확인 중`}><div className={styles.sectionHeader}><h2>{title}</h2></div><div className={styles.skeletonTabs} />{Array.from({ length: 3 }, (_, index) => <div key={index} className={styles.skeletonRow}><span /><div><i /><i /></div></div>)}</section>)}</div>;
}
