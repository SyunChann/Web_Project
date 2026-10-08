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
};

type FrankfurterRate = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

const exchangeRateEndpoint = "https://api.frankfurter.dev/v2/rates";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildRate(
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

async function fetchRates(base: ExchangeRate["code"], from: string, to: string) {
  const searchParams = new URLSearchParams({
    base,
    quotes: "KRW",
    from,
    to,
  });
  const response = await fetch(`${exchangeRateEndpoint}?${searchParams}`, {
    next: { revalidate: 60 * 60 },
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) throw new Error(`Exchange rate request failed: ${response.status}`);

  const rows = (await response.json()) as FrankfurterRate[];
  if (!Array.isArray(rows)) throw new Error("Unexpected exchange rate response");
  return rows;
}

export async function getExchangeRateSnapshot(): Promise<ExchangeRateSnapshot | null> {
  try {
    const today = new Date();
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - 10);

    const [jpyRows, usdRows] = await Promise.all([
      fetchRates("JPY", formatDate(from), formatDate(today)),
      fetchRates("USD", formatDate(from), formatDate(today)),
    ]);

    const rates = [
      buildRate(jpyRows, "JPY", "¥", 100),
      buildRate(usdRows, "USD", "$", 1),
    ].filter((rate): rate is ExchangeRate => rate !== null);

    if (rates.length !== 2) return null;

    const date = rates[0].points.at(-1)?.date;
    return date ? { date, rates } : null;
  } catch {
    return null;
  }
}
