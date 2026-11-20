import type { Metadata } from "next";
import { Suspense } from "react";
import { TossShoppingPage } from "@/components/TossShoppingPage";
import { getTossSharelinkContent } from "@/lib/tossSharelink";

export const metadata: Metadata = {
  title: "토스쇼핑 베스트 | 취향보관소",
  description: "토스쇼핑 베스트셀러의 상품 이미지와 가격을 한눈에 확인합니다.",
};
export const dynamic = "force-dynamic";

export default function RecommendationsPage() {
  return <Suspense fallback={<TossShoppingPage result={{ status: "not-configured" }} loading />}><RecommendationsContent /></Suspense>;
}

async function RecommendationsContent() {
  const result = await getTossSharelinkContent();
  return <TossShoppingPage result={result} />;
}
