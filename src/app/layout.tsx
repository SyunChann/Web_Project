import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const mainFont = localFont({
  src: "../assets/fonts/My_Font.woff",
  variable: "--font-main",
  display: "swap",
});

export const metadata: Metadata = {
  title: "취향보관소",
  description: "감상과 기대작을 모아두는 개인 콘텐츠 아카이브",
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
