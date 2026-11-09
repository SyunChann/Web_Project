export type ExchangeRatePoint = {
  date: string;
  value: number;
};

export type ExchangeRate = {
  code: "JPY" | "USD";
  symbol: "¥" | "$";
  unit: number;
  value: number;
  changePercent: number;
  points: ExchangeRatePoint[];
};

export type ExchangeRateSnapshot = {
  date: string;
  rates: ExchangeRate[];
  source: "koreaexim" | "frankfurter";
  sourceLabel: string;
};

type FrankfurterRate = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

type KoreaEximRate = {
  result?: number;
  cur_unit?: string;
  deal_bas_r?: string;
};

type DatedKoreaEximRates = {
  date: string;
  rows: KoreaEximRate[];
};

const frankfurterEndpoint = "https://api.frankfurter.dev/v2/rates";
const koreaEximEndpoint = "https://www.koreaexim.go.kr/site/program/financial/exchangeJSON";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildFrankfurterRate(
  rows: FrankfurterRate[],
  code: ExchangeRate["code"],
  symbol: ExchangeRate["symbol"],
  unit: number,
): ExchangeRate | null {
  const points = rows
    .filter((row) => row.base === code && row.quote === "KRW" && Number.isFinite(row.rate) && row.rate > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({ date: row.date, value: unit * row.rate }))
    .slice(-7);

  if (!points.length) return null;

  const latest = points.at(-1)!;
  const previous = points.at(-2);
  const changePercent = previous
    ? ((latest.value - previous.value) / previous.value) * 100
    : 0;

  return {
    code,
    symbol,
    unit,
    value: latest.value,
    changePercent,
    points,
  };
}

async function fetchFrankfurterRates(base: ExchangeRate["code"], from: string, to: string) {
  const searchParams = new URLSearchParams({
    base,
    quotes: "KRW",
    from,
    to,
  });
  const response = await fetch(`${frankfurterEndpoint}?${searchParams}`, {
    next: { revalidate: 60 * 60 },
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) throw new Error(`Exchange rate request failed: ${response.status}`);

  const rows = (await response.json()) as FrankfurterRate[];
  if (!Array.isArray(rows)) throw new Error("Unexpected exchange rate response");
  return rows;
}

function parseKoreaEximRate(value?: string) {
  if (!value) return null;

  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildKoreaEximRate(
  days: DatedKoreaEximRates[],
  code: ExchangeRate["code"],
  symbol: ExchangeRate["symbol"],
  unit: number,
  currencyUnit: "USD" | "JPY(100)",
): ExchangeRate | null {
  const points = days
    .flatMap(({ date, rows }) => {
      const row = rows.find((item) => item.result === 1 && item.cur_unit === currencyUnit);
      const value = parseKoreaEximRate(row?.deal_bas_r);

      return value ? [{ date, value }] : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  if (!points.length) return null;

  const latest = points.at(-1)!;
  const previous = points.at(-2);
  const changePercent = previous
    ? ((latest.value - previous.value) / previous.value) * 100
    : 0;

  return {
    code,
    symbol,
    unit,
    value: latest.value,
    changePercent,
    points,
  };
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
    searchdate: date,
    data: "AP01",
  });
  const response = await fetch(`${koreaEximEndpoint}?${searchParams}`, {
    next: { revalidate: 60 * 60 * 6 },
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) throw new Error(`Korea Exim rate request failed: ${response.status}`);

  const rows = (await response.json()) as KoreaEximRate[];
  if (!Array.isArray(rows)) throw new Error("Unexpected Korea Exim rate response");
  return rows;
}

async function getKoreaEximSnapshot(): Promise<ExchangeRateSnapshot | null> {
  const authKey = process.env.KOREAEXIM_API_KEY?.trim();
  if (!authKey) return null;

  const dates = getRecentSeoulDates(16);
  const results = await Promise.allSettled(
    dates.map(async (date) => ({ date, rows: await fetchKoreaEximRates(date, authKey) })),
  );
  const days = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const rates = [
    buildKoreaEximRate(days, "JPY", "¥", 100, "JPY(100)"),
    buildKoreaEximRate(days, "USD", "$", 1, "USD"),
  ].filter((rate): rate is ExchangeRate => rate !== null);

  if (rates.length !== 2) return null;

  const date = rates.map((rate) => rate.points.at(-1)!.date).sort().at(0);
  return date
    ? { date, rates, source: "koreaexim", sourceLabel: "한국수출입은행 매매기준율" }
    : null;
}

async function getFrankfurterSnapshot(): Promise<ExchangeRateSnapshot | null> {
  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 10);

  const [jpyRows, usdRows] = await Promise.all([
    fetchFrankfurterRates("JPY", formatDate(from), formatDate(today)),
    fetchFrankfurterRates("USD", formatDate(from), formatDate(today)),
  ]);

  const rates = [
    buildFrankfurterRate(jpyRows, "JPY", "¥", 100),
    buildFrankfurterRate(usdRows, "USD", "$", 1),
  ].filter((rate): rate is ExchangeRate => rate !== null);

  if (rates.length !== 2) return null;

  const date = rates[0].points.at(-1)?.date;
  return date
    ? { date, rates, source: "frankfurter", sourceLabel: "ECB 기준 원화 환산" }
    : null;
}

export async function getExchangeRateSnapshot(): Promise<ExchangeRateSnapshot | null> {
  try {
    const koreaEximSnapshot = await getKoreaEximSnapshot();
    if (koreaEximSnapshot) return koreaEximSnapshot;

    return await getFrankfurterSnapshot();
  } catch {
    try {
      return await getFrankfurterSnapshot();
    } catch {
      return null;
    }
  }
}
