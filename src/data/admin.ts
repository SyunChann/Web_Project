import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminContentMeta, normalizeAdminContent, type AdminContentKind, type AdminSourceRow } from "@/lib/adminContent";

export async function getAdminContent(client: SupabaseClient, userId: string) {
  const kinds = Object.keys(adminContentMeta) as AdminContentKind[];
  const results = await Promise.allSettled(kinds.map(async (kind) => {
    const fields = kind === "drink" ? "id,name,created_at,images,author_name,author_id"
      : ["domestic", "overseas", "travel"].includes(kind) ? "id,title,created_at,thumbnail,summary,latitude,longitude,author_name"
        : kind === "watchlist" ? "id,title,created_at,thumbnail,reason,author_name" : "id,title,created_at,thumbnail,summary,author_name";
    let query = client.from(adminContentMeta[kind].table).select(fields, { count: "exact" });
    if (kind === "domestic") query = query.or("scope.eq.domestic,scope.is.null");
    if (kind === "overseas") query = query.eq("scope", "overseas");
    if (kind === "travel") query = query.or("scope.eq.overseas,scope.is.null");
    const result = await query.order("created_at", { ascending: false }).order("id").limit(8);
    if (result.error || result.count === null) throw new Error("Content query failed");
    return { kind, count: result.count, rows: normalizeAdminContent(kind, (result.data ?? []) as unknown as AdminSourceRow[], userId) };
  }));
  return kinds.map((kind, index) => {
    const result = results[index];
    return result.status === "fulfilled" ? { ...result.value, error: false } : { kind, count: null, rows: [], error: true };
  });
}
