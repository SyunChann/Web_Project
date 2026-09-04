import "server-only";

const TOKEN_URL = "https://oauth2.cert.toss.im/token";
const API_BASE_URL = "https://sharelink.toss.im/openapi";
const CACHE_TTL_MS = 60 * 60 * 1000;

type TossApiResult<T> = {
  resultType: "SUCCESS" | "FAIL";
  success?: T;
  error?: { errorCode?: string; reason?: string; message?: string };
};

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
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
};

type LinkResult = {
  tacaItemId: number;
  publisherId: string;
  shortUrl: string;
  originUrl: string;
};

export type TossSharelinkProduct = ProductDetail & {
  shareUrl: string;
};

export type TossSharelinkContentState =
  | { status: "not-configured" }
  | { status: "ready"; product: TossSharelinkProduct }
  | { status: "error" };

let tokenCache: { value: string; expiresAt: number } | null = null;
const productCache = new Map<number, { value: TossSharelinkProduct; expiresAt: number }>();

function getConfig() {
  const accessKey = process.env.TOSS_SHARELINK_ACCESS_KEY?.trim();
  const secretKey = process.env.TOSS_SHARELINK_SECRET_KEY?.trim();
  const publisherId = process.env.TOSS_SHARELINK_PUBLISHER_ID?.trim();
  const itemId = Number(process.env.TOSS_SHARELINK_FEATURED_ITEM_ID);

  if (!accessKey || !secretKey || !publisherId || !Number.isSafeInteger(itemId) || itemId <= 0) return null;
  return { accessKey, secretKey, publisherId, itemId };
}

async function getAccessToken(accessKey: string, secretKey: string) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: accessKey,
    client_secret: secretKey,
    scope: "sharelink:read sharelink:write",
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`토스쉐어 토큰 발급 실패: ${response.status}`);

  const payload = (await response.json()) as TokenResponse;
  if (!payload.access_token) throw new Error("토스쉐어 액세스 토큰이 없습니다.");
  tokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000,
  };
  return tokenCache.value;
}

async function callApi<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`토스쉐어 API 호출 실패: ${response.status}`);

  const payload = (await response.json()) as TossApiResult<T>;
  if (payload.resultType !== "SUCCESS" || !payload.success) {
    throw new Error(payload.error?.errorCode || payload.error?.reason || payload.error?.message || "토스쉐어 API 처리 실패");
  }
  return payload.success;
}

async function loadProduct(itemId: number, publisherId: string, token: string) {
  const detail = await callApi<{ items: ProductDetail[] }>(`/products/detail?tacaItemIds=${itemId}`, token);
  const product = detail.items.find((item) => item.tacaItemId === itemId) ?? detail.items[0];
  if (!product) throw new Error("노출 가능한 토스쇼핑 상품을 찾을 수 없습니다.");

  const link = await callApi<LinkResult>("/links", token, {
    method: "POST",
    body: JSON.stringify({ tacaItemId: itemId, publisherId }),
  });
  return { ...product, shareUrl: link.shortUrl || link.originUrl };
}

export async function getTossSharelinkContent(): Promise<TossSharelinkContentState> {
  const config = getConfig();
  if (!config) return { status: "not-configured" };

  const cached = productCache.get(config.itemId);
  if (cached && cached.expiresAt > Date.now()) return { status: "ready", product: cached.value };

  try {
    const token = await getAccessToken(config.accessKey, config.secretKey);
    const product = await loadProduct(config.itemId, config.publisherId, token);
    productCache.set(config.itemId, { value: product, expiresAt: Date.now() + CACHE_TTL_MS });
    return { status: "ready", product };
  } catch (error) {
    console.error("토스쉐어 추천 콘텐츠를 불러오지 못했습니다.", error);
    return { status: "error" };
  }
}
