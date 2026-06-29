import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const mainFont = localFont({
  src: "../assets/fonts/My_Font.ttf",
  variable: "--font-main",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Review Collection",
  description: "개인 콘텐츠 리뷰 컬렉션",
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
      </body>
    </html>
  );
}
