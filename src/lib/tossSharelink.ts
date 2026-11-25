import "server-only";
import { observeApi } from "@/lib/apiMonitoring";
import { ApiRequestError, httpObservation } from "@/lib/apiMonitoringModel";

import { readTossSuccess, tossOperation, TossResponseError } from "@/lib/tossResponse";

const CACHE_TTL_MS = 60 * 60 * 1000;
const DISPLAY_PRODUCT_COUNT = 20;
const BEST_SELLING_CANDIDATE_COUNT = 50;
const LINK_REQUEST_CONCURRENCY = 5;
const STALE_RETRY_TTL_MS = 5 * 60 * 1000;
const MAX_DATA_AGE_MS = 24 * 60 * 60 * 1000;

type TossApiResult<T> = {
  resultType: "SUCCESS" | "FAIL";
  success?: T;
  error?: { errorCode?: string; reason?: string; message?: string };
};

type RankedProduct = {
  tacaItemId: number;
  displayName: string;
  thumbnailUrl?: string | null;
  displayPrice: number;
  originalPrice?: number | null;
  discountRate?: number | null;
  isSoldOut: boolean;
  reviewScore?: number | null;
  reviewCount?: number | null;
  rank?: number;
  categoryIds?: number[];
};

type LinkResult = {
  tacaItemId: number;
  publisherId: string;
  shortUrl: string;
  originUrl: string;
};

export type TossSharelinkProduct = RankedProduct & {
  rank: number;
  shareUrl: string;
};

export type TossSharelinkContentState =
  | { status: "not-configured" }
  | { status: "ready"; products: TossSharelinkProduct[] }
  | { status: "error" };

type ProductCache = { value: TossSharelinkProduct[]; expiresAt: number; loadedAt: number };
const productCaches = new Map<string, ProductCache>();
const productLoads = new Map<string, Promise<TossSharelinkProduct[]>>();
const MAX_PRODUCT_CACHES = 16;
export type TossFashionCategory = { categoryId: number; displayName: string; label: string };
type CategoryNode = { categoryId: number; displayName: string; children?: CategoryNode[] };
export type TossFashionContentState = TossSharelinkContentState & {
  categories: TossFashionCategory[];
  selectedCategory?: TossFashionCategory;
};
let fashionCategoriesCache: { value: TossFashionCategory[]; expiresAt: number; loadedAt: number } | null = null;
let fashionCategoriesLoad: Promise<TossFashionCategory[]> | null = null;

// 상품명 대신 토스가 제공하는 카테고리 트리만 사용합니다.
export function getFashionCategories(nodes: CategoryNode[]): TossFashionCategory[] {
  const rootNames = ["패션", "남성패션", "여성패션", "유아동패션"];
  const normalize = (name: string) => name.replace(/[\s/·&-]/g, "");
  const roots: CategoryNode[] = [];
  const result: TossFashionCategory[] = [];
  const seen = new Set<number>();
  const valid = (node: CategoryNode) => node && Number.isSafeInteger(node.categoryId) && node.categoryId > 0 && typeof node.displayName === "string";
  function add(node: CategoryNode, label: string) {
    if (!valid(node) || seen.has(node.categoryId)) return;
    seen.add(node.categoryId);
    result.push({ categoryId: node.categoryId, displayName: node.displayName, label });
  }
  function visit(list: CategoryNode[], depth: number) {
    if (depth > 5 || !Array.isArray(list)) return;
    for (const node of list) {
      if (!valid(node)) continue;
      // 동일 이름의 반려동물 의류나 생활용 시계를 사람의 패션과 섞지 않습니다.
      if (/반려|애완|강아지|고양이|펫/.test(node.displayName)) continue;
      if (rootNames.includes(normalize(node.displayName))) roots.push(node);
      visit(node.children ?? [], depth + 1);
    }
  }
  visit(nodes, 1);
  roots.sort((a, b) => rootNames.indexOf(normalize(a.displayName)) - rootNames.indexOf(normalize(b.displayName)));
  for (const root of roots) {
    add(root, root.displayName);
    if (Array.isArray(root.children)) {
      for (const child of root.children) {
        if (valid(child)) add(child, rootNames.includes(normalize(child.displayName)) ? child.displayName : `${root.displayName} > ${child.displayName}`);
      }
    }
  }
  return result;
}

function getConfig() {
  const proxyBaseUrl = process.env.TOSS_PROXY_BASE_URL?.trim().replace(/\/+$/, "");
  const proxyApiKey = process.env.TOSS_PROXY_API_KEY?.trim();

  if (!proxyBaseUrl || !proxyApiKey) return null;
  return { proxyBaseUrl, proxyApiKey };
}

async function callProxy<T>(
  proxyBaseUrl: string,
  proxyApiKey: string,
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(`${proxyBaseUrl}${path}`, {
    ...init,
    headers: {
      "x-proxy-api-key": proxyApiKey,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  // 경로가 없을 때 프록시는 JSON 대신 HTML을 보낼 수 있습니다.
  // 본문 파싱보다 HTTP 상태를 먼저 확인해 404/인증 오류를 보존합니다.
  if (!response.ok) throw new TossResponseError(httpObservation(response.status).state, response.status, tossOperation(path));
  let payload: TossApiResult<T> | null;
  try {
    payload = (await response.json()) as TossApiResult<T> | null;
  } catch {
    throw new TossResponseError("invalid-response", response.status, tossOperation(path), "PROXY_INVALID_JSON");
  }
  return readTossSuccess<T>(payload, response.status, tossOperation(path));
}

async function loadProducts(proxyBaseUrl: string, proxyApiKey: string, categoryId?: number) {
  const bestSelling = await callProxy<{ items: RankedProduct[]; category?: { categoryId: number } }>(
    proxyBaseUrl,
    proxyApiKey,
    categoryId === undefined
      ? `/v1/products/best-selling?size=${BEST_SELLING_CANDIDATE_COUNT}`
      : `/v1/products/best-categories/${categoryId}?size=${BEST_SELLING_CANDIDATE_COUNT}`,
  );
  if (!Array.isArray(bestSelling.items) || (categoryId !== undefined && bestSelling.category?.categoryId !== categoryId)) {
    throw new ApiRequestError("invalid-response");
  }
  const rankedProducts = bestSelling.items.slice(0, BEST_SELLING_CANDIDATE_COUNT);
  const itemIds = [...new Set(rankedProducts.map((product) => product.tacaItemId))];
  if (itemIds.length === 0 && categoryId !== undefined) return [];
  if (itemIds.length === 0) throw new Error("토스쇼핑 베스트 상품을 찾을 수 없습니다.");

  // Ranking responses already contain every field rendered by the cards.
  // Do not make display depend on the separately authorized detail endpoint.
  const candidates = rankedProducts.filter((product) => !product.isSoldOut);
  const availableProducts: TossSharelinkProduct[] = [];
  let firstLinkError: unknown;

  for (
    let startIndex = 0;
    startIndex < candidates.length && availableProducts.length < DISPLAY_PRODUCT_COUNT;
    startIndex += LINK_REQUEST_CONCURRENCY
  ) {
    const batch = candidates.slice(startIndex, startIndex + LINK_REQUEST_CONCURRENCY);
    const linkedProducts = await Promise.all(
      batch.map(async (product) => {
        try {
          const link = await callProxy<LinkResult>(proxyBaseUrl, proxyApiKey, "/v1/links", {
            method: "POST",
            body: JSON.stringify({ tacaItemId: product.tacaItemId }),
          });
          const shareUrl = link.shortUrl || link.originUrl;
          if (!shareUrl) return null;
          const url = new URL(shareUrl);
          return url.protocol === "https:" && !url.username && !url.password ? { product, shareUrl } : null;
        } catch (error) {
          firstLinkError ??= error;
          console.error(`토스쇼핑 상품 ${product.tacaItemId} 링크 발급 실패`, error);
          return null;
        }
      }),
    );

    for (const linkedProduct of linkedProducts) {
      if (!linkedProduct || availableProducts.length >= DISPLAY_PRODUCT_COUNT) continue;
      availableProducts.push({
        ...linkedProduct.product,
        rank: availableProducts.length + 1,
        shareUrl: linkedProduct.shareUrl,
      });
    }
  }

  if (availableProducts.length === 0 && firstLinkError) throw firstLinkError;
  if (availableProducts.length === 0 && categoryId === undefined) throw new Error("노출 가능한 토스쇼핑 상품이 없습니다.");
  return availableProducts;
}

async function getCachedProducts(config: NonNullable<ReturnType<typeof getConfig>>, categoryId?: number): Promise<TossSharelinkContentState> {
  const key = categoryId === undefined ? "best-selling" : `fashion:${categoryId}`;
  const cached = productCaches.get(key);
  if (cached && cached.expiresAt > Date.now()) return { status: "ready", products: cached.value };
  try {
    if (!productLoads.has(key)) productLoads.set(key, observeApi("toss", () => loadProducts(config.proxyBaseUrl, config.proxyApiKey, categoryId)));
    const products = await productLoads.get(key)!;
    const now = Date.now();
    productCaches.delete(key);
    // 카테고리 순위는 KST 오전 9시(UTC 자정)에 갱신되므로 다음 고시까지 재사용합니다.
    const expiresAt = categoryId === undefined ? now + CACHE_TTL_MS
      : (Math.floor(now / MAX_DATA_AGE_MS) + 1) * MAX_DATA_AGE_MS;
    productCaches.set(key, { value: products, expiresAt, loadedAt: now });
    if (productCaches.size > MAX_PRODUCT_CACHES) productCaches.delete(productCaches.keys().next().value!);
    return { status: "ready", products };
  } catch (error) {
    console.error("토스쇼핑 상품을 불러오지 못했습니다.", error);
    if (cached && Date.now() - cached.loadedAt < MAX_DATA_AGE_MS) {
      cached.expiresAt = Math.min(Date.now() + STALE_RETRY_TTL_MS, cached.loadedAt + MAX_DATA_AGE_MS);
      return { status: "ready", products: cached.value };
    }
    return { status: "error" };
  } finally {
    productLoads.delete(key);
  }
}

export async function getTossSharelinkContent(): Promise<TossSharelinkContentState> {
  const config = getConfig();
  return config ? getCachedProducts(config) : { status: "not-configured" };
}

async function getCachedFashionCategories(config: NonNullable<ReturnType<typeof getConfig>>) {
  const cached = fashionCategoriesCache;
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    fashionCategoriesLoad ??= observeApi("toss", async () => {
      const tree = await callProxy<{ categories: CategoryNode[] }>(config.proxyBaseUrl, config.proxyApiKey, "/v1/categories");
      if (!Array.isArray(tree.categories)) throw new ApiRequestError("invalid-response");
      return getFashionCategories(tree.categories);
    });
    const value = await fashionCategoriesLoad;
    const now = Date.now();
    fashionCategoriesCache = { value, expiresAt: now + 6 * CACHE_TTL_MS, loadedAt: now };
    return value;
  } catch (error) {
    if (cached && Date.now() - cached.loadedAt < MAX_DATA_AGE_MS) {
      cached.expiresAt = Math.min(Date.now() + STALE_RETRY_TTL_MS, cached.loadedAt + MAX_DATA_AGE_MS);
      return cached.value;
    }
    throw error;
  } finally {
    fashionCategoriesLoad = null;
  }
}

export async function getTossFashionContent(requestedCategory?: string): Promise<TossFashionContentState> {
  const config = getConfig();
  if (!config) return { status: "not-configured", categories: [] };
  try {
    const categories = await getCachedFashionCategories(config);
    if (!categories.length) return { status: "ready", categories, products: [] };
    const id = /^[1-9]\d*$/.test(requestedCategory ?? "") ? Number(requestedCategory) : NaN;
    const selectedCategory = categories.find((category) => category.categoryId === id) ?? categories[0];
    const result = await getCachedProducts(config, selectedCategory.categoryId);
    return { ...result, categories, selectedCategory };
  } catch {
    return { status: "error", categories: [] };
  }
}
