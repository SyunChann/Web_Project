import "server-only";
import { unstable_cache } from "next/cache";
import { observeApi } from "@/lib/apiMonitoring";
import { ApiRequestError, httpObservation } from "@/lib/apiMonitoringModel";

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
  if (!response.ok) throw new ApiRequestError(httpObservation(response.status).state, response.status);
  const payload = await response.json();
  if (payload?.resultType !== "SUCCESS" || !Array.isArray(payload.success?.items)) throw new ApiRequestError("invalid-response");
  const seen = new Set<number>();
  return payload.success.items.slice(0, 50).flatMap((item: { tacaItemId?: number; displayName?: string; displayPrice?: number; isSoldOut?: boolean }, index: number) => {
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
