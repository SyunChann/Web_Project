import "server-only";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type ContentPageOptions = { query?: string; scope?: string; category?: string; status?: string; sort?: string; page?: number };
export function normalizePage(page?: number) { return Number.isFinite(page) ? Math.min(10000, Math.max(1, Math.floor(page!))) : 1; }
export async function fetchContentPage<Row>(section: "watchlist" | "restaurants" | "travel", options: ContentPageOptions) {
  const client = createSupabasePublicClient();
  const empty = { rows: [] as Row[], count: 0, page: 1, error: "목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." };
  if (!client) return empty;
  try {
    const { data, error } = await client.rpc("archive_list_page_v1", {
      p_section: section, p_query: (options.query ?? "").trim().slice(0, 500), p_scope: options.scope ?? null,
      p_category: options.category ?? "all", p_status: options.status ?? "all", p_sort: options.sort ?? "created-desc", p_page: normalizePage(options.page),
    });
    if (error || !data || !Array.isArray(data.items)) return empty;
    return { rows: data.items as Row[], count: Number(data.total_count), page: Number(data.page), error: null };
  } catch { return empty; }
}
