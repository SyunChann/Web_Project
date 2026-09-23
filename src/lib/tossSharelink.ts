import "server-only";

const CACHE_TTL_MS = 60 * 60 * 1000;
const DISPLAY_PRODUCT_COUNT = 20;
const BEST_SELLING_CANDIDATE_COUNT = 50;
const PRODUCT_DETAIL_BATCH_SIZE = 20;
const LINK_REQUEST_CONCURRENCY = 5;
const STALE_RETRY_TTL_MS = 5 * 60 * 1000;

type TossApiResult<T> = {
  resultType: "SUCCESS" | "FAIL";
  success?: T;
  error?: { errorCode?: string; reason?: string; message?: string };
};

type ProductDetail = {
  tacaItemId: number;
  displayName: string;
  displayPrice: number;
  originalPrice?: number | null;
  discountRate?: number | null;
  isSoldOut: boolean;
  reviewScore?: number | null;
  reviewCount?: number | null;
  rank?: number;
};

type LinkResult = {
  tacaItemId: number;
  publisherId: string;
  shortUrl: string;
  originUrl: string;
};

export type TossSharelinkProduct = ProductDetail & {
  rank: number;
  shareUrl: string;
};

export type TossSharelinkContentState =
  | { status: "not-configured" }
  | { status: "ready"; products: TossSharelinkProduct[] }
  | { status: "error" };

let productCache: { value: TossSharelinkProduct[]; expiresAt: number } | null = null;
let productLoadPromise: Promise<TossSharelinkProduct[]> | null = null;

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

  const payload = (await response.json()) as TossApiResult<T>;
  if (!response.ok || payload.resultType !== "SUCCESS" || !payload.success) {
    throw new Error(
      payload.error?.errorCode ||
        payload.error?.reason ||
        payload.error?.message ||
        `토스 프록시 호출 실패: ${response.status}`,
    );
  }
  return payload.success;
}

async function loadProducts(proxyBaseUrl: string, proxyApiKey: string) {
  const bestSelling = await callProxy<{ items: ProductDetail[] }>(
    proxyBaseUrl,
    proxyApiKey,
    `/v1/products/best-selling?size=${BEST_SELLING_CANDIDATE_COUNT}`,
  );
  const rankedProducts = bestSelling.items.slice(0, BEST_SELLING_CANDIDATE_COUNT);
  const itemIds = [...new Set(rankedProducts.map((product) => product.tacaItemId))];
  if (itemIds.length === 0) throw new Error("토스쇼핑 베스트 상품을 찾을 수 없습니다.");

  const detailBatches = await Promise.all(
    Array.from({ length: Math.ceil(itemIds.length / PRODUCT_DETAIL_BATCH_SIZE) }, (_, index) =>
      itemIds.slice(
        index * PRODUCT_DETAIL_BATCH_SIZE,
        (index + 1) * PRODUCT_DETAIL_BATCH_SIZE,
      ),
    ).map((batch) =>
      callProxy<{ items: ProductDetail[] }>(
        proxyBaseUrl,
        proxyApiKey,
        `/v1/products/detail?tacaItemIds=${batch.join(",")}`,
      ),
    ),
  );
  const detailsById = new Map(
    detailBatches.flatMap((detail) => detail.items).map((product) => [product.tacaItemId, product]),
  );

  const candidates = rankedProducts
    .map((product) => detailsById.get(product.tacaItemId) ?? product)
    .filter((product) => !product.isSoldOut);
  const availableProducts: TossSharelinkProduct[] = [];

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
          return shareUrl ? { product, shareUrl } : null;
        } catch (error) {
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

  if (availableProducts.length === 0) throw new Error("노출 가능한 토스쇼핑 상품이 없습니다.");
  return availableProducts;
}

export async function getTossSharelinkContent(): Promise<TossSharelinkContentState> {
  const config = getConfig();
  if (!config) return { status: "not-configured" };

  if (productCache && productCache.expiresAt > Date.now()) {
    return { status: "ready", products: productCache.value };
  }

  try {
    productLoadPromise ??= loadProducts(config.proxyBaseUrl, config.proxyApiKey);
    const products = await productLoadPromise;
    productCache = { value: products, expiresAt: Date.now() + CACHE_TTL_MS };
    return { status: "ready", products };
  } catch (error) {
    console.error("토스쇼핑 베스트를 불러오지 못했습니다.", error);

    if (productCache) {
      productCache.expiresAt = Date.now() + STALE_RETRY_TTL_MS;
      return { status: "ready", products: productCache.value };
    }

    return { status: "error" };
  } finally {
    productLoadPromise = null;
  }
}
