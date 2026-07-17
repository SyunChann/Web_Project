import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type PriceWatchlist = { id: string; title: string; productUrl: string; source: string; currentPrice: number; lowestPrice: number; targetPrice?: number; createdAt: string; lastCheckedAt?: string };
export type PriceHistory = { id: string; watchlistId: string; price: number; checkedAt: string };

async function getPriceWatchlistsFromSupabase() {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("price_watchlists").select("id,title,product_url,source,current_price,lowest_price,target_price,created_at,last_checked_at").eq("is_active", true).order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((item) => ({ id: item.id, title: item.title, productUrl: item.product_url, source: item.source, currentPrice: Number(item.current_price), lowestPrice: Number(item.lowest_price), targetPrice: item.target_price == null ? undefined : Number(item.target_price), createdAt: item.created_at, lastCheckedAt: item.last_checked_at ?? undefined }));
}

export const getPriceWatchlists = unstable_cache(getPriceWatchlistsFromSupabase, ["price-watchlists"], { tags: ["price-watchlists"], revalidate: 60 });

export async function getRecentPriceHistory(ids: string[]) {
  const supabase = createSupabasePublicClient();
  if (!supabase || !ids.length) return [];
  const { data, error } = await supabase.from("price_history").select("id,watchlist_id,price,checked_at").in("watchlist_id", ids).order("checked_at", { ascending: false }).limit(60);
  if (error || !data) return [];
  return data.map((item) => ({ id: item.id, watchlistId: item.watchlist_id, price: Number(item.price), checkedAt: item.checked_at }));
}
