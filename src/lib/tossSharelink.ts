import "server-only";

const CACHE_TTL_MS = 60 * 60 * 1000;
const BEST_SELLING_SIZE = 20;

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
    `/v1/products/best-selling?size=${BEST_SELLING_SIZE}`,
  );
  const rankedProducts = bestSelling.items.slice(0, BEST_SELLING_SIZE);
  const itemIds = [...new Set(rankedProducts.map((product) => product.tacaItemId))];
  if (itemIds.length === 0) throw new Error("토스쇼핑 베스트셀러 상품을 찾을 수 없습니다.");

  const detail = await callProxy<{ items: ProductDetail[] }>(
    proxyBaseUrl,
    proxyApiKey,
    `/v1/products/detail?tacaItemIds=${itemIds.join(",")}`,
  );
  const detailsById = new Map(detail.items.map((product) => [product.tacaItemId, product]));

  const products = await Promise.all(
    rankedProducts.map(async (rankedProduct, index) => {
      const product = detailsById.get(rankedProduct.tacaItemId) ?? rankedProduct;

      try {
        const link = await callProxy<LinkResult>(proxyBaseUrl, proxyApiKey, "/v1/links", {
          method: "POST",
          body: JSON.stringify({ tacaItemId: product.tacaItemId }),
        });
        return {
          ...product,
          rank: rankedProduct.rank ?? index + 1,
          shareUrl: link.shortUrl || link.originUrl,
        } satisfies TossSharelinkProduct;
      } catch (error) {
        console.error(`토스쇼핑 상품 ${product.tacaItemId} 링크 발급 실패`, error);
        return null;
      }
    }),
  );

  const availableProducts = products.filter(
    (product): product is TossSharelinkProduct => product !== null,
  );
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
    const products = await loadProducts(config.proxyBaseUrl, config.proxyApiKey);
    productCache = { value: products, expiresAt: Date.now() + CACHE_TTL_MS };
    return { status: "ready", products };
  } catch (error) {
    console.error("토스쇼핑 베스트셀러를 불러오지 못했습니다.", error);
    return { status: "error" };
  }
}
