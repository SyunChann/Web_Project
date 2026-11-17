import "server-only";
import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";

type Summary = { title: string; createdAt: string };
async function latest(table: string, scope?: string): Promise<Summary | null> {
  const client = createSupabasePublicClient();
  if (!client) return null;
  let query = client.from(table).select(table === "travel" ? "title,trip_title,created_at" : "title,created_at");
  if (scope) query = scope === "domestic" ? query.or("scope.eq.domestic,scope.is.null") : query.eq("scope", scope);
  try {
    const { data, error } = await query.order("created_at", { ascending: false }).order("id").limit(1)
      .overrideTypes<{ title: string; trip_title?: string; created_at: string }[], { merge: false }>();
    const row = data?.[0];
    return !error && row ? { title: row.trip_title ?? row.title, createdAt: row.created_at } : null;
  } catch { return null; }
}
export const getHomeSummary = unstable_cache(async () => {
  const [reviews, watchlist, merchandise, domestic, overseas, travel] = await Promise.all([
    latest("reviews"), latest("watchlist_items"), latest("merchandise_reviews"),
    latest("restaurant_reviews", "domestic"), latest("restaurant_reviews", "overseas"), latest("travel", "overseas"),
  ]);
  return { reviews, watchlist, merchandise, domestic, overseas, travel };
}, ["home-summary-v1"], { revalidate: 60, tags: ["reviews", "watchlist", "merchandise-reviews", "restaurants", "travel"] });
