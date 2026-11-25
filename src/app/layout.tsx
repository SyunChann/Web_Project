import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ListNavigation } from "@/components/ListNavigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import localFont from "next/font/local";
import { getSiteUrl } from "@/lib/siteUrl";
import { siteName as siteTitle, siteDescription } from "@/lib/siteIdentity";
import "./globals.css";
import "./site-theme.css";
import { SiteShell } from "@/components/site/SiteShell";

const mainFont = localFont({
  src: "../assets/fonts/My_Font.woff",
  variable: "--font-main",
  display: "swap",
});

const shareImage = {
  url: "/share/home-v3",
  width: 1200,
  height: 630,
  alt: "취향 보관소 — 콘텐츠 · 맛집 · 여행 · 술",
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: siteTitle,
  title: siteTitle,
  description: siteDescription,
  verification: {
    google: "By_xqE24eXDuy7_6PZM5pbDTs7UEhke4ussjcWcsx6w",
    other: {
      "naver-site-verification": "5397321c629e72b032fa829f420d4d9d8d008193",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [{ url: shareImage.url, alt: shareImage.alt }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={mainFont.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SiteShell>{children}</SiteShell>
          <Suspense fallback={null}><ListNavigation /></Suspense>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
