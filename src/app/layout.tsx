import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { getSiteUrl } from "@/lib/siteUrl";
import "./globals.css";

const mainFont = localFont({
  src: "../assets/fonts/My_Font.woff",
  variable: "--font-main",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: "취향보관소",
  title: "취향보관소",
  description: "콘텐츠 리뷰, 기대작, 맛집, 여행과 추천 기록을 모아두는 개인 취향 아카이브",
  verification: {
    google: "By_xqE24eXDuy7_6PZM5pbDTs7UEhke4ussjcWcsx6w",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "취향보관소",
    title: "취향보관소",
    description: "콘텐츠 리뷰, 기대작, 맛집, 여행과 추천 기록을 모아두는 개인 취향 아카이브",
  },
  twitter: {
    card: "summary",
    title: "취향보관소",
    description: "콘텐츠 리뷰, 기대작, 맛집, 여행과 추천 기록을 모아두는 개인 취향 아카이브",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={mainFont.variable}>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
