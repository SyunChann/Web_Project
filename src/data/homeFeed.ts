import "server-only";
import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { supabaseUrl } from "@/lib/supabase/config";
import { getTravelPostsPage } from "@/data/travel";
import { drinkCategories } from "@/lib/drinks";

export type HomeGroup = "content" | "restaurants" | "travel" | "drinks";
export type HomeEntry = { id: string; href: string; title: string; label: string; group: HomeGroup; image: string | null; rating: number | null; detail: string; createdAt: string };
type Source = "reviews" | "watchlist" | "merchandise" | "restaurants" | "travel" | "drinks";
type Row = { id: string; title?: string; name?: string; created_at: string; thumbnail?: string | null; rating?: number | null; type?: string; scope?: string; category?: string; kind?: string; images?: string[]; tags?: string[] };
const sources: Source[] = ["reviews", "watchlist", "merchandise", "restaurants", "travel", "drinks"];
const settings = {
  reviews: { table: "reviews", fields: "id,title,created_at,thumbnail,rating,type", tag: "reviews", path: "/reviews", label: "콘텐츠 리뷰", group: "content" },
  watchlist: { table: "watchlist_items", fields: "id,title,created_at,thumbnail,type", tag: "watchlist", path: "/watchlist", label: "기대작", group: "content" },
  merchandise: { table: "merchandise_reviews", fields: "id,title,created_at,thumbnail,rating", tag: "merchandise-reviews", path: "/merchandise", label: "상품 리뷰", group: "content" },
  restaurants: { table: "restaurant_reviews", fields: "id,title,created_at,thumbnail,rating,scope", tag: "restaurants", path: "/restaurants", label: "맛집", group: "restaurants" },
  travel: { table: "travel", fields: "", tag: "travel", path: "/travel", label: "해외여행", group: "travel" },
  drinks: { table: "drink_posts", fields: "id,name,created_at,images,rating,category,kind", tag: "drinks", path: "/drinks", label: "술 취향", group: "drinks" },
} as const;
const typeNames: Record<string, string> = { movie: "영화", anime: "애니메이션", game: "게임", drama: "드라마" };

export function homeThumbnail(value?: string | null): string | null {
  if (!value || value.length > 2048) return null;
  if (value.startsWith("/thumbnails/") && !/[\\\u0000-\u001f]/.test(value)) return value;
  try {
    const url = new URL(value);
    const storage = supabaseUrl ? new URL(supabaseUrl) : null;
    // Keep the home lightweight: no Maps SDK or on-demand Place Photo requests.
    return url.protocol === "https:" && !url.username && !url.password && ((storage && url.origin === storage.origin && url.pathname.startsWith("/storage/v1/object/public/")) || (url.hostname === "s4.anilist.co" && !url.port)) ? value : null;
  } catch { return null; }
}
function rowEntry(source: Source, row: Row): HomeEntry {
  const config = settings[source];
  const drinkImage = source === "drinks" && row.images?.[0] && supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/drink-photos/${row.images[0].split("/").map(encodeURIComponent).join("/")}` : null;
  const rating = row.rating === null || row.rating === undefined ? null : Number(row.rating);
  return {
    id: `${source}:${row.id}`, href: `${config.path}/${encodeURIComponent(row.id)}`, title: row.title || row.name || "제목 없는 기록",
    label: source === "restaurants" ? (row.scope === "overseas" ? "해외 맛집" : "국내 맛집") : config.label, group: config.group,
    image: homeThumbnail(drinkImage || row.thumbnail), rating: Number.isFinite(rating) && !(source === "drinks" && row.kind === "curious") ? rating : null,
    detail: source === "drinks" ? [drinkCategories[row.category as keyof typeof drinkCategories] || "기타", row.kind === "curious" ? "궁금한 술" : "마신 술 리뷰"].join(" · ") : typeNames[row.type || ""] || "",
    createdAt: row.created_at,
  };
}
async function loadSource(source: Source): Promise<HomeEntry[]> {
  if (source === "travel") {
    // Reuse the existing grouped list so one itinerary does not occupy several rows.
    const result = await getTravelPostsPage({ scope: "overseas", sort: "created-desc", page: 1 });
    if (result.error) throw Error("Home travel unavailable");
    return result.items.slice(0, 3).map(({ travel }) => ({ id: `travel:${travel.id}`, href: `/travel/${encodeURIComponent(travel.id)}`, title: travel.tripTitle || travel.title, label: "해외여행", group: "travel", image: homeThumbnail(travel.thumbnail), rating: null, detail: "여행 기록", createdAt: travel.createdAt }));
  }
  const client = createSupabasePublicClient();
  if (!client) throw Error("Home source unavailable");
  const config = settings[source];
  const { data, error } = await client.from(config.table).select(config.fields).order("created_at", { ascending: false }).order("id").limit(3);
  if (error || !data) throw Error("Home source unavailable");
  return (data as unknown as Row[]).map((row) => rowEntry(source, row));
}
const reads = Object.fromEntries(sources.map((source) => [source, unstable_cache(() => loadSource(source), [`home-feed-v2-${source}`], { revalidate: 60, tags: [settings[source].tag] })])) as Record<Source, () => Promise<HomeEntry[]>>;
export async function getHomeFeed() {
  const results = await Promise.allSettled(sources.map((source) => reads[source]()));
  const entries = results.flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .filter((entry) => Number.isFinite(Date.parse(entry.createdAt)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
  return { entries, partial: results.some((result) => result.status === "rejected") };
}
