import { getSiteUrl } from "@/lib/siteUrl";

export const siteName = "취향 보관소";
export const homeSearchTitle = "취향 보관소 | 리뷰·맛집·여행·술 기록";
export const siteDescription = "콘텐츠 리뷰와 맛집·여행 후기, 위스키·사케 시음 기록을 모으는 개인 취향 아카이브입니다. 인천공항 출국 안내도 확인하세요.";

export function websiteStructuredData() {
  const url = new URL("/", getSiteUrl()).href;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}#website`,
    name: siteName,
    alternateName: ["취향보관소", "Syun Archive"],
    url,
    description: siteDescription,
    inLanguage: "ko-KR",
  };
}
