import type { Metadata } from "next";
import { Suspense } from "react";
import Form from "next/form";
import { TossShoppingPage } from "@/components/TossShoppingPage";
import { getTossFashionContent } from "@/lib/tossSharelink";
import styles from "../Recommendations.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "패션 인기 상품 | 취향보관소",
  description: "토스쇼핑 패션 카테고리의 인기 상품과 가격을 확인하세요.",
  alternates: { canonical: "/recommendations/fashion" },
};

type FashionPageProps = {
  searchParams?: Promise<{ category?: string | string[] }>;
};
export default function FashionRecommendationsPage(props: FashionPageProps) {
  return <Suspense fallback={<TossShoppingPage result={{ status: "not-configured" }} fashion loading />}><FashionContent {...props} /></Suspense>;
}

async function FashionContent({ searchParams }: FashionPageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params?.category) ? params.category[0] : params?.category;
  const result = await getTossFashionContent(requested);
  return <TossShoppingPage result={result} fashion categoryName={result.selectedCategory?.displayName}>
    {result.categories.length > 1 ? <Form action="/recommendations/fashion" className={styles.categoryFilter}>
      <label htmlFor="fashion-category">패션 분류</label>
      <select id="fashion-category" name="category" defaultValue={result.selectedCategory?.categoryId}>
        {result.categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.displayName === "패션" ? "전체 패션" : category.displayName}</option>)}
      </select>
      <button type="submit">보기</button>
    </Form> : null}
  </TossShoppingPage>;
}
