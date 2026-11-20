import { observeApi } from "@/lib/apiMonitoring";
import { ApiRequestError, httpObservation } from "@/lib/apiMonitoringModel";

import { buildKoreaEximRates, buildFrankfurterRates, type ExchangeRateSnapshot, type KoreaEximRate, type FrankfurterRate } from "@/lib/exchangeRateModel";
export type { ExchangeRatePoint, ExchangeRate, ExchangeRateSnapshot } from "@/lib/exchangeRateModel";

const frankfurterEndpoint = "https://api.frankfurter.dev/v2/rates";
const koreaEximEndpoint = "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function fetchFrankfurterRates(from: string, to: string) {
  const searchParams = new URLSearchParams({
    base: "KRW",
    providers: "ecb",
    from,
    to,
  });
  const response = await fetch(`${frankfurterEndpoint}?${searchParams}`, {
    next: { revalidate: 60 * 60 },
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) throw new ApiRequestError(httpObservation(response.status).state, response.status);

  const rows = (await response.json()) as FrankfurterRate[];
  if (!Array.isArray(rows)) throw new ApiRequestError("invalid-response");
  return rows.filter((row) => row && typeof row === "object");
}

function getRecentSeoulDates(length: number) {
  const seoulNow = new Date(Date.now() + 9 * 60 * 60 * 1000);

  return Array.from({ length }, (_, index) => {
    const date = new Date(seoulNow);
    date.setUTCDate(date.getUTCDate() - (length - index - 1));
    return formatDate(date);
  });
}

async function fetchKoreaEximRates(date: string, authKey: string) {
  const searchParams = new URLSearchParams({
    authkey: authKey,
    searchdate: date.replaceAll("-", ""),
    data: "AP01",
  });
  const response = await fetch(`${koreaEximEndpoint}?${searchParams}`, {
    next: { revalidate: 60 * 60 * 6 },
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) throw new ApiRequestError(httpObservation(response.status).state, response.status);

  const rows = (await response.json()) as KoreaEximRate[];
  if (!Array.isArray(rows)) throw new ApiRequestError("invalid-response");
  const items = rows.filter((row) => row && typeof row === "object");
  if (items.some((row) => row.result === 3)) throw new ApiRequestError("authentication");
  if (items.some((row) => row.result === 4)) throw new ApiRequestError("rate-limit");
  return items;
}

async function getKoreaEximSnapshot(): Promise<ExchangeRateSnapshot | null> {
  const authKey = process.env.KOREAEXIM_API_KEY?.trim();
  if (!authKey) return null;
  return observeApi("exchange-koreaexim", () => loadKoreaEximSnapshot(authKey), (snapshot) => ({ state: snapshot ? "ok" : "empty" }));
}
async function loadKoreaEximSnapshot(authKey: string): Promise<ExchangeRateSnapshot | null> {

  const dates = getRecentSeoulDates(16);
  const results = await Promise.allSettled(
    dates.map(async (date) => ({ date, rows: await fetchKoreaEximRates(date, authKey) })),
  );
  const days = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const rates = buildKoreaEximRates(days);

  if (!rates.some((rate) => rate.code === "JPY") || !rates.some((rate) => rate.code === "USD")) {
    const failed = results.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    return null;
  }

  const date = rates.map((rate) => rate.points.at(-1)!.date).sort().at(0);
  return date
    ? { date, rates, source: "koreaexim", sourceLabel: "한국수출입은행 매매기준율" }
    : null;
}

async function getFrankfurterSnapshot(): Promise<ExchangeRateSnapshot | null> {
  return observeApi("exchange-ecb", loadFrankfurterSnapshot, (snapshot) => ({ state: snapshot ? "ok" : "empty" }));
}
async function loadFrankfurterSnapshot(): Promise<ExchangeRateSnapshot | null> {
  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 10);

  const rows = await fetchFrankfurterRates(formatDate(from), formatDate(today));
  const rates = buildFrankfurterRates(rows);
  if (!rates.some((rate) => rate.code === "JPY") || !rates.some((rate) => rate.code === "USD")) return null;

  const date = rates[0].points.at(-1)?.date;
  return date
    ? { date, rates, source: "frankfurter", sourceLabel: "ECB 기준 원화 환산" }
    : null;
}

export async function getExchangeRateSnapshot(): Promise<ExchangeRateSnapshot | null> {
  try {
    const koreaEximSnapshot = await getKoreaEximSnapshot();
    if (koreaEximSnapshot) return koreaEximSnapshot;
  } catch {
    // The official provider records its failure; continue with the fallback once.
  }
  try {
    return await getFrankfurterSnapshot();
  } catch {
    return null;
  }
}
