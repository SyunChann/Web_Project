import "server-only";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { supabaseUrl } from "@/lib/supabase/config";
import { drinkBucket, type DrinkPost, drinkCategories, drinkKinds } from "@/lib/drinks";

export function drinkPhotoUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${drinkBucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
export function drinkDataError(code?: string) {
  return ["42P01", "PGRST205"].includes(code ?? "")
    ? "술 취향 게시판을 준비 중입니다. 잠시 후 다시 방문해 주세요."
    : "술 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
export async function getDrinkPosts(params: { q?: string; category?: string; kind?: string; page?: string }) {
  const client = createSupabasePublicClient();
  const page = Math.max(1, Math.min(10000, Math.floor(Number(params.page) || 1)));
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 80);
  const category = typeof params.category === "string" && Object.hasOwn(drinkCategories, params.category) ? params.category : "";
  const kind = typeof params.kind === "string" && Object.hasOwn(drinkKinds, params.kind) ? params.kind : "";
  const filters = { q, category, kind, page };
  if (!client) return { posts: [] as DrinkPost[], count: 0, error: drinkDataError(), filters };
  let query = client.from("drink_posts").select("*", { count: "exact" }).order("created_at", { ascending: false }).order("id");
  if (category) query = query.eq("category", category);
  if (kind) query = query.eq("kind", kind);
  if (q) query = query.ilike("name", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  try {
    const { data, count, error } = await query.range((page - 1) * 24, page * 24 - 1);
    return { posts: (data ?? []) as DrinkPost[], count: count ?? 0, error: error ? drinkDataError(error.code) : null, filters };
  } catch { return { posts: [] as DrinkPost[], count: 0, error: drinkDataError(), filters }; }
}
export async function getDrinkPost(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { post: null, error: null };
  const client = createSupabasePublicClient();
  if (!client) return { post: null, error: drinkDataError() };
  try {
    const { data, error } = await client.from("drink_posts").select("*").eq("id", id).maybeSingle();
    return { post: data as DrinkPost | null, error: error ? drinkDataError(error.code) : null };
  } catch { return { post: null, error: drinkDataError() }; }
}
