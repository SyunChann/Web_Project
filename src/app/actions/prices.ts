"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createPriceWatchlist(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const productUrl = String(formData.get("productUrl") ?? "").trim();
  const currentPrice = Number(formData.get("currentPrice"));
  const targetPrice = Number(formData.get("targetPrice"));
  if (!title || !productUrl || !Number.isFinite(currentPrice) || currentPrice < 0) throw new Error("상품명, 쿠팡 링크, 현재 가격을 확인해 주세요.");
  let url: URL;
  try { url = new URL(productUrl); } catch { throw new Error("올바른 상품 링크를 입력해 주세요."); }
  if (!url.hostname.endsWith("coupang.com")) throw new Error("첫 버전은 쿠팡 상품 링크만 지원합니다.");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=config");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const id = `price-${Date.now()}`;
  const { error } = await supabase.from("price_watchlists").insert({ id, title, product_url: productUrl, source: "coupang", current_price: currentPrice, lowest_price: currentPrice, target_price: Number.isFinite(targetPrice) && targetPrice > 0 ? targetPrice : null, author_id: user.id });
  if (error) {
    if (error.message.includes("Could not find the table 'public.price_watchlists'")) {
      throw new Error("Supabase SQL Editor에서 add-price-watchlists.sql을 먼저 실행해 주세요.");
    }

    throw new Error(error.message);
  }
  const { error: historyError } = await supabase.from("price_history").insert({ watchlist_id: id, price: currentPrice, source: "manual" });
  if (historyError) throw new Error(historyError.message);
  updateTag("price-watchlists"); revalidatePath("/prices"); redirect("/prices");
}

export async function recordPrice(id: string, formData: FormData) {
  const price = Number(formData.get("price"));
  if (!Number.isFinite(price) || price < 0) throw new Error("올바른 가격을 입력해 주세요.");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=config");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: item, error: itemError } = await supabase.from("price_watchlists").select("author_id,lowest_price").eq("id", id).maybeSingle();
  if (itemError || !item || item.author_id !== user.id) throw new Error("가격을 갱신할 권한이 없습니다.");
  const lowestPrice = Math.min(Number(item.lowest_price), price);
  const { error } = await supabase.from("price_watchlists").update({ current_price: price, lowest_price: lowestPrice, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  const { error: historyError } = await supabase.from("price_history").insert({ watchlist_id: id, price, source: "manual" });
  if (historyError) throw new Error(historyError.message);
  updateTag("price-watchlists"); revalidatePath("/prices");
}

export async function updatePriceWatchlist(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const rawTargetPrice = String(formData.get("targetPrice") ?? "").trim();
  const targetPrice = rawTargetPrice ? Number(rawTargetPrice) : null;

  if (!title) throw new Error("상품명을 입력해 주세요.");
  if (targetPrice !== null && (!Number.isFinite(targetPrice) || targetPrice < 0)) {
    throw new Error("목표 가격을 확인해 주세요.");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=config");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("price_watchlists")
    .update({ title, target_price: targetPrice, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) throw new Error(error.message);
  updateTag("price-watchlists");
  revalidatePath("/prices");
}
