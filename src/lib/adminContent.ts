export const adminContentMeta = {
  review: { label: "콘텐츠 리뷰", table: "reviews", listHref: "/reviews", base: "/reviews", tone: "text-[#be4b49]" },
  watchlist: { label: "기대작", table: "watchlist_items", listHref: "/watchlist/items", base: "/watchlist", tone: "text-[#2f7f7a]" },
  domestic: { label: "국내 맛집", table: "restaurant_reviews", listHref: "/restaurants/items", base: "/restaurants", tone: "text-[#e57632]" },
  overseas: { label: "해외 맛집", table: "restaurant_reviews", listHref: "/restaurants/items?scope=overseas", base: "/restaurants", tone: "text-[#0284c7]" },
  travel: { label: "해외여행", table: "travel", listHref: "/travel/items", base: "/travel", tone: "text-[#4d7c0f]" },
  merchandise: { label: "상품 리뷰", table: "merchandise_reviews", listHref: "/merchandise", base: "/merchandise", tone: "text-[#7c3fa0]" },
  drink: { label: "술 취향", table: "drink_posts", listHref: "/drinks", base: "/drinks", tone: "text-[#304d70]" },
} as const;
export type AdminContentKind = keyof typeof adminContentMeta;
export type AdminSourceRow = {
  id: string; title?: string; name?: string; created_at: string;
  thumbnail?: string | null; images?: string[]; summary?: string | null; reason?: string | null;
  latitude?: number | null; longitude?: number | null; author_name?: string | null; author_id?: string | null;
};
export type AdminContentRow = {
  id: string; kind: AdminContentKind; title: string; authorName: string | null; createdAt: string;
  thumbnail: string | null; summary: string | null; latitude: number | null; longitude: number | null; canEdit: boolean;
};
export function normalizeAdminContent(kind: AdminContentKind, rows: AdminSourceRow[], userId: string): AdminContentRow[] {
  return rows.map((row) => ({
    id: row.id, kind, title: row.name ?? row.title ?? "제목 없음", authorName: row.author_name ?? null,
    createdAt: row.created_at, thumbnail: row.thumbnail ?? row.images?.[0] ?? null,
    summary: row.summary ?? row.reason ?? null, latitude: row.latitude ?? null, longitude: row.longitude ?? null,
    canEdit: kind !== "drink" || row.author_id === userId,
  }));
}
export function adminContentIssues(item: AdminContentRow) {
  const issues: { label: string; icon: "image" | "location" | "content" }[] = [];
  // Drink photos are optional and the feature has no separate summary field.
  if (item.kind !== "drink") {
    if (!item.thumbnail?.trim()) issues.push({ label: "대표 이미지 추가 가능", icon: "image" });
    if (!item.summary?.trim()) issues.push({ label: "요약 없음", icon: "content" });
  }
  if (["domestic", "overseas", "travel"].includes(item.kind)
    && (item.latitude === null || item.longitude === null || !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude))) {
    issues.push({ label: "장소 좌표 없음", icon: "location" });
  }
  return issues;
}
