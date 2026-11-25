import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeSidebar, HomeAccount, HomeBottomNav } from "@/components/home/HomeNavigation";
import { HomeRecentEntries } from "@/components/home/HomeRecentEntries";
import { HomeAirportInfo, HomeEditorPick, HomeExchangeRates, HomeRatesSkeleton } from "@/components/home/HomeQuickInfo";
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
  return <div className={styles.root}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData()).replace(/</g, "\\u003c") }} />
    <a href="#home-records" className={styles.skipLink}>최근 기록으로 바로가기</a>
    {message ? <StatusToast key={message} message={message} /> : null}
    <div className={styles.shell}><HomeSidebar />
      <main className={styles.main}>
        <div className={styles.topbar}><p className={styles.breadcrumb}>취향 보관소 / 모아보기</p><Suspense fallback={<div className={styles.accountPlaceholder} aria-label="계정 확인 중" />}><HomeAccount /></Suspense></div>
        <header className={styles.intro}><h1>좋아한 것들의 기록.</h1><p>보고, 맛보고, 다녀온 순간을 차곡차곡.</p></header>
        <aside className={styles.utilities} aria-label="추천과 생활 정보"><HomeEditorPick /><HomeAirportInfo /><Suspense fallback={<HomeRatesSkeleton />}><HomeExchangeRates /></Suspense></aside>
        <div className={styles.content} id="home-records"><Suspense fallback={<HomeFeedSkeleton />}><RecentFeed /></Suspense></div>
        <footer className={styles.footer}><span>취향은 기록으로 남습니다.</span><span>콘텐츠 · 맛집 · 여행 · 술</span></footer>
      </main>
    </div><HomeBottomNav />
  </div>;
}
async function RecentFeed() { const feed = await getHomeFeed(); return <HomeRecentEntries entries={feed.entries} partial={feed.partial} />; }
function HomeFeedSkeleton() {
  return <section className={styles.recent} aria-busy="true" aria-label="최근 기록 확인 중"><div className={styles.sectionHeader}><h2>최근 남긴 기록</h2></div><div className={styles.skeletonTabs} />{Array.from({ length: 3 }, (_, index) => <div key={index} className={styles.skeletonRow}><span /><div><i /><i /></div></div>)}</section>;
}
