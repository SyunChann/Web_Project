import "server-only";
import { unstable_cache } from "next/cache";
import { observeApi } from "@/lib/apiMonitoring";
import { httpObservation } from "@/lib/apiMonitoringModel";

import { readTossSuccess, TossResponseError } from "@/lib/tossResponse";

export type HomeProduct = { id: number; name: string; price: number; rank: number };
export type HomeShopping = { products: HomeProduct[]; unavailable: boolean };
const readProducts = unstable_cache(async (): Promise<HomeProduct[]> => observeApi("toss", async () => {
  const base = process.env.TOSS_PROXY_BASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.TOSS_PROXY_API_KEY?.trim();
  if (!base || !key) throw Error("Home shopping unavailable");
  // Reuse the proxy's existing ranking cache. No detail or affiliate-link creation calls.
  const response = await fetch(`${base}/v1/products/best-selling?size=50`, {
    headers: { "x-proxy-api-key": key }, cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new TossResponseError(httpObservation(response.status).state, response.status, "best-selling");
  let payload: unknown;
  try { payload = await response.json(); } catch { throw new TossResponseError("invalid-response", response.status, "best-selling", "PROXY_INVALID_JSON"); }
  const success = readTossSuccess<{items: unknown[]}>(payload, response.status, "best-selling");
  if (!Array.isArray(success.items)) throw new TossResponseError("invalid-response", response.status, "best-selling", "PROXY_INVALID_ITEMS");
  const seen = new Set<number>();
  return (success.items as { tacaItemId?: number; displayName?: string; displayPrice?: number; isSoldOut?: boolean }[]).slice(0, 50).flatMap((item: { tacaItemId?: number; displayName?: string; displayPrice?: number; isSoldOut?: boolean }, index: number) => {
    if (!Number.isSafeInteger(item?.tacaItemId) || item.tacaItemId! <= 0 || seen.has(item.tacaItemId!) || item.isSoldOut
      || typeof item.displayName !== "string" || !item.displayName.trim() || typeof item.displayPrice !== "number" || !Number.isFinite(item.displayPrice) || item.displayPrice < 0) return [];
    seen.add(item.tacaItemId!);
    return [{ id: item.tacaItemId!, name: item.displayName, price: item.displayPrice, rank: index + 1 }];
  }).slice(0, 2);
}, (products) => ({ state: products.length ? "ok" : "empty" })), ["home-shopping-v1"], { revalidate: 3600 });
export async function getHomeShopping(): Promise<HomeShopping> {
  if (!process.env.TOSS_PROXY_BASE_URL?.trim() || !process.env.TOSS_PROXY_API_KEY?.trim()) return { products: [], unavailable: true };
  try { return { products: await readProducts(), unavailable: false }; }
  catch { return { products: [], unavailable: true }; }
}
