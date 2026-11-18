import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { supabaseUrl } from "@/lib/supabase/config";
import { drinkBucket, type DrinkPost, type DrinkPostPreview, readDrinkFilters, type DrinkFilterParams } from "@/lib/drinks";

export function drinkPhotoUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${drinkBucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
export function drinkDataError(code?: string) {
  return ["42P01", "PGRST205", "PGRST202"].includes(code ?? "")
    ? "술 취향 게시판을 준비 중입니다. 잠시 후 다시 방문해 주세요."
    : "술 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
const getCachedDrinkPreviews = unstable_cache(async (filters: ReturnType<typeof readDrinkFilters>) => {
  const client = createSupabasePublicClient();
  const { q, category, kind, rating, tag, page } = filters;
  if (!client) throw Error("public client unavailable");
  const { data, error } = await client.rpc("drink_list_page_v1", {
    p_query: q, p_category: category, p_kind: kind, p_rating: rating ? Number(rating) : null, p_tag: tag, p_page: page,
  });
  if (error) throw error;
  const payload = data as { items?: DrinkPostPreview[]; total_count?: number } | null;
  if (!payload || !Array.isArray(payload.items) || !Number.isFinite(payload.total_count)) throw Error("invalid list response");
  return { posts: payload.items, count: payload.total_count! };
}, ["drink-previews-v1"], { revalidate: 60, tags: ["drinks"] });

export async function getDrinkPosts(params: DrinkFilterParams) {
  const filters = readDrinkFilters(params);
  try {
    return { ...await getCachedDrinkPreviews(filters), error: null, filters };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
    return { posts: [] as DrinkPostPreview[], count: 0, error: drinkDataError(code), filters };
  }
}
export const getDrinkPost = cache(async (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { post: null, error: null };
  const client = createSupabasePublicClient();
  if (!client) return { post: null, error: drinkDataError() };
  try {
    const { data, error } = await client.from("drink_posts").select("*").eq("id", id).maybeSingle();
    return { post: data as DrinkPost | null, error: error ? drinkDataError(error.code) : null };
  } catch { return { post: null, error: drinkDataError() }; }
});
