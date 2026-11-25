import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export const defaultShareImage = "/share/home-v4";

export function postMetadata({ title, description, path, image, imageAlt }: {
  title: string; description?: string; path: string; image?: string; imageAlt?: string;
}): Metadata {
  const summary = (description ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || "좋아하는 것을 기록하는 공간.";
  let photo = defaultShareImage;
  if (image) {
    try {
      const url = new URL(image, getSiteUrl());
      if (["https:", "http:"].includes(url.protocol) && !url.pathname.toLowerCase().endsWith(".svg")) photo = url.href;
    } catch { /* Missing or invalid photos use the site's share image. */ }
  }
  const images = [{ url: photo, alt: imageAlt || title }];
  const fullTitle = `${title} | 취향 보관소`;
  return {
    title: fullTitle, description: summary, alternates: { canonical: path },
    openGraph: { type: "article", locale: "ko_KR", siteName: "취향 보관소", title: fullTitle, description: summary, url: path, images },
    twitter: { card: "summary_large_image", title: fullTitle, description: summary, images },
  };
}
