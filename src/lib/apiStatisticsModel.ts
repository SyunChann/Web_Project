import { apiServices, apiStates, type ApiService, type ApiState } from "@/lib/apiMonitoringModel";

export type ApiDailyObservation = { service: ApiService; day: string; total_count: number; success_count: number; limited_count: number; duration_total_ms: number; max_duration_ms: number };
export type ApiIncident = { service: ApiService; state: ApiState; previous_state: ApiState | null; checked_at: string; http_status: number | null };
export type ApiStatistics = { window_start: string; window_end: string; first_observation_at: string | null; daily: ApiDailyObservation[]; incidents: ApiIncident[] };
export type ApiStatisticsResult = { state: "ready"; data: ApiStatistics } | { state: "forbidden" | "unconfigured" | "unavailable"; data: null };
export type ApiDaySummary = { day: string; total: number; success: number; limited: number; duration: number; max: number };

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
export function koreanDay(value: string | number) { return dayFormat.format(new Date(value)); }
export function summarizeApiDays(data: ApiStatistics, service: ApiService | "all"): ApiDaySummary[] {
  const start = Date.parse(data.window_start);
  return Array.from({ length: 7 }, (_, index) => {
    const day = koreanDay(start + index * 86400000);
    return data.daily.filter(row => row.day === day && (service === "all" || row.service === service)).reduce<ApiDaySummary>((sum, row) => ({
      day, total: sum.total + row.total_count, success: sum.success + row.success_count, limited: sum.limited + row.limited_count,
      duration: sum.duration + row.duration_total_ms, max: Math.max(sum.max, row.max_duration_ms),
    }), { day, total: 0, success: 0, limited: 0, duration: 0, max: 0 });
  });
}
export function apiDayRate(day: ApiDaySummary) { return day.total ? day.success / day.total * 100 : null; }
export function apiDayDuration(day: ApiDaySummary) { return day.total ? day.duration / day.total : null; }
export function incidentKind(event: ApiIncident) {
  if (event.state === "ok" || event.state === "empty") return "정상 복귀";
  return event.previous_state && !["ok", "empty"].includes(event.previous_state) ? "문제 상태 변경" : "문제 관측";
}

// Fail closed on malformed RPC results instead of displaying fabricated zero statistics.
export function parseApiStatistics(value: unknown): ApiStatistics | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const validTime = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
  if (!validTime(data.window_start) || !validTime(data.window_end) || Date.parse(data.window_end) < Date.parse(data.window_start)
    || Date.parse(data.window_end) - Date.parse(data.window_start) > 7 * 86400000 || !Array.isArray(data.daily) || data.daily.length > 70 || !Array.isArray(data.incidents) || data.incidents.length > 500) return null;
  if (data.first_observation_at !== null && !validTime(data.first_observation_at)) return null;
  const seen = new Set<string>();
  for (const row of data.daily) {
    if (!row || !Object.hasOwn(apiServices, row.service) || !/^\d{4}-\d{2}-\d{2}$/.test(row.day) || !validTime(`${row.day}T00:00:00+09:00`) || koreanDay(`${row.day}T00:00:00+09:00`) !== row.day
      || row.day < koreanDay(data.window_start) || row.day > koreanDay(data.window_end)) return null;
    const key = `${row.service}:${row.day}`;
    if (seen.has(key)) return null; seen.add(key);
    if (![row.total_count,row.success_count,row.limited_count,row.duration_total_ms,row.max_duration_ms].every(n => Number.isSafeInteger(n) && n >= 0)
      || row.success_count > row.total_count || row.limited_count > row.total_count || row.max_duration_ms > 300000 || row.duration_total_ms > row.total_count * 300000) return null;
  }
  for (const event of data.incidents) {
    if (!event || !Object.hasOwn(apiServices, event.service) || !apiStates.includes(event.state) || (event.previous_state !== null && !apiStates.includes(event.previous_state)) || !validTime(event.checked_at)
      || (event.http_status !== null && (!Number.isInteger(event.http_status) || event.http_status < 100 || event.http_status > 599))) return null;
  }
  return {
    window_start: data.window_start, window_end: data.window_end, first_observation_at: data.first_observation_at as string | null,
    daily: data.daily.map(row => ({ service: row.service, day: row.day, total_count: row.total_count, success_count: row.success_count, limited_count: row.limited_count, duration_total_ms: row.duration_total_ms, max_duration_ms: row.max_duration_ms })),
    incidents: data.incidents.map(event => ({ service: event.service, state: event.state, previous_state: event.previous_state, checked_at: event.checked_at, http_status: event.http_status })),
  };
}
