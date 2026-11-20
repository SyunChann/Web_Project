export type ExchangeRatePoint = { date: string; value: number };
export type ExchangeRate = {
  code: string;
  name: string;
  symbol: string;
  unit: number;
  value: number;
  changePercent: number | null;
  points: ExchangeRatePoint[];
};
export type ExchangeRateSnapshot = {
  date: string;
  rates: ExchangeRate[];
  source: "koreaexim" | "frankfurter";
  sourceLabel: string;
};
export type KoreaEximRate = { result?: number; cur_unit?: string; cur_nm?: string; deal_bas_r?: string };
export type DatedKoreaEximRates = { date: string; rows: KoreaEximRate[] };
export type FrankfurterRate = { date: string; base: string; quote: string; rate: number };

const names: Record<string, string> = {
  JPY: "일본 엔", USD: "미국 달러", EUR: "유로", GBP: "영국 파운드", CNH: "중국 위안(역외)",
  CNY: "중국 위안", AUD: "호주 달러", CAD: "캐나다 달러", CHF: "스위스 프랑",
  HKD: "홍콩 달러", SGD: "싱가포르 달러", IDR: "인도네시아 루피아", THB: "태국 바트",
};
const preferred = ["JPY", "USD", "EUR", "CNH", "CNY", "GBP", "AUD", "HKD", "SGD"];
export function currencyName(code: string) {
  return names[code] ?? new Intl.DisplayNames("ko", { type: "currency" }).of(code) ?? code;
}
function currencySymbol(code: string) {
  return new Intl.NumberFormat("ko", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
    .formatToParts(0).find((part) => part.type === "currency")?.value ?? code;
}
function positiveNumber(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value.trim())) return null;
  const n = typeof value === "string" ? Number(value.replaceAll(",", "").trim()) : value;
  return Number.isFinite(n) && n > 0 ? n : null;
}
export function parseCurrencyUnit(value?: string) {
  const match = /^([A-Z]{3})(?:\((\d+)\))?$/.exec(value ?? "");
  if (!match || match[1] === "KRW") return null;
  const unit = Number(match[2] ?? 1);
  return Number.isSafeInteger(unit) && unit > 0 && unit <= 10000 ? { code: match[1], unit } : null;
}
function buildRate(code: string, unit: number, points: ExchangeRatePoint[], name?: string): ExchangeRate | null {
  const unique = new Map(points.filter((point) => Number.isFinite(point.value) && point.value > 0).map((point) => [point.date, point]));
  const sorted = [...unique.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const latest = sorted.at(-1);
  if (!latest) return null;
  const previous = sorted.at(-2);
  const change = previous ? ((latest.value - previous.value) / previous.value) * 100 : null;
  return { code, name: names[code] ?? (name?.trim() || currencyName(code)), symbol: currencySymbol(code), unit,
    value: latest.value, changePercent: change !== null && Number.isFinite(change) ? change : null, points: sorted };
}
function sortRates(rates: ExchangeRate[]) {
  const rank = (code: string) => preferred.includes(code) ? preferred.indexOf(code) : preferred.length;
  return rates.sort((a, b) => rank(a.code) - rank(b.code) || a.code.localeCompare(b.code));
}
export function buildKoreaEximRates(days: DatedKoreaEximRates[]) {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.findLast((day) => day.rows.some((row) => row.result === 1 && parseCurrencyUnit(row.cur_unit) && positiveNumber(row.deal_bas_r)));
  if (!latest) return [];
  const seen = new Set<string>();
  return sortRates(latest.rows.flatMap((row) => {
    const currency = parseCurrencyUnit(row.cur_unit);
    if (row.result !== 1 || !currency || !positiveNumber(row.deal_bas_r) || seen.has(currency.code)) return [];
    seen.add(currency.code);
    const points = sorted.flatMap((day) => {
      const item = day.rows.find((r) => r.result === 1 && r.cur_unit === row.cur_unit);
      const value = positiveNumber(item?.deal_bas_r);
      return value ? [{ date: day.date, value }] : [];
    });
    const rate = buildRate(currency.code, currency.unit, points, row.cur_nm);
    return rate ? [rate] : [];
  }));
}
export function buildFrankfurterRates(rows: FrankfurterRate[]) {
  const valid = rows.filter((row) => row.base === "KRW" && /^[A-Z]{3}$/.test(row.quote) && row.quote !== "KRW"
    && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && positiveNumber(row.rate));
  const latestDate = valid.map((row) => row.date).sort().at(-1);
  const codes = [...new Set(valid.filter((row) => row.date === latestDate).map((row) => row.quote))];
  return sortRates(codes.flatMap((code) => {
    const unit = code === "JPY" || code === "IDR" ? 100 : 1;
    const rate = buildRate(code, unit, valid.filter((row) => row.quote === code)
      .map((row) => ({ date: row.date, value: unit / row.rate })));
    return rate ? [rate] : [];
  }));
}
export function convertCurrency(amount: string, rate: Pick<ExchangeRate, "value" | "unit">, direction: "to-krw" | "from-krw") {
  if (!/^\d{1,12}(?:\.\d{0,6})?$/.test(amount) || !positiveNumber(rate.value) || !positiveNumber(rate.unit)) return null;
  const value = Number(amount);
  const converted = direction === "to-krw" ? value * rate.value / rate.unit : value * rate.unit / rate.value;
  return Number.isFinite(converted) ? converted : null;
}
