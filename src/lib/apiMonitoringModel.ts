export const apiServices = {
  "icn-flights": { name: "일본행 항공편", provider: "공공데이터포털", href: "/departures", idleMinutes: 15 },
  "icn-t1": { name: "T1 출국장 혼잡도", provider: "공공데이터포털", href: "/departures", idleMinutes: 15 },
  "icn-t2": { name: "T2 출국장 혼잡도", provider: "공공데이터포털", href: "/departures", idleMinutes: 15 },
  "exchange-koreaexim": { name: "한국수출입은행 환율", provider: "한국수출입은행", href: "/", idleMinutes: 1440 },
  "exchange-ecb": { name: "ECB 환율", provider: "Frankfurter · ECB", href: "/", idleMinutes: 1440 },
  toss: { name: "토스 추천 상품", provider: "토스 쉐어링크 프록시", href: "/recommendations", idleMinutes: 1440 },
  "naver-shopping": { name: "네이버 상품 검색", provider: "네이버", href: "/new?type=merchandise", idleMinutes: 1440 },
  "lck-official": { name: "LCK 공식 일정", provider: "LoL Esports", href: "/lck-calendar", idleMinutes: 1440 },
  "lck-naver": { name: "LCK 보조 일정", provider: "네이버 e스포츠", href: "/lck-calendar", idleMinutes: 1440 },
  anilist: { name: "애니메이션 공개 일정", provider: "AniList", href: "/release-calendar", idleMinutes: 1440 },
} as const;
export type ApiService = keyof typeof apiServices;
export const apiStates = ["ok", "empty", "partial", "stale", "authentication", "rate-limit", "timeout", "invalid-response", "upstream-error", "network-error"] as const;
export type ApiState = typeof apiStates[number];
export type ApiObservation = { state: ApiState; httpStatus?: number; sourceUpdatedAt?: string | null };
export type ApiEvent = { service: ApiService; state: ApiState; checked_at: string; duration_ms: number; http_status: number | null; source_updated_at: string | null };
export type ApiHealthRow = ApiEvent & { last_success_at: string | null; last_error_at: string | null; last_error_state: ApiState | null };
export class ApiRequestError extends Error {
  constructor(public kind: ApiState, public httpStatus?: number) { super(kind); this.name = "ApiRequestError"; }
}
export function httpObservation(status: number): ApiObservation {
  return { state: status === 401 || status === 403 ? "authentication" : status === 429 ? "rate-limit" : "upstream-error", httpStatus: status };
}
export function failureObservation(error: unknown): ApiObservation {
  if (error instanceof ApiRequestError) return { state: error.kind, httpStatus: error.httpStatus };
  const name = error && typeof error === "object" && "name" in error ? error.name : "";
  return { state: name === "AbortError" || name === "TimeoutError" ? "timeout" : name === "SyntaxError" ? "invalid-response" : "network-error" };
}
export function resultObservation(result: { state: string; diagnostic?: string; updatedAt?: string }): ApiObservation | null {
  if (result.state === "missing-key") return null;
  const state: ApiState = result.state === "ready" || result.state === "success" ? "ok" : result.state === "empty" ? "empty"
    : result.state === "authentication" ? "authentication" : result.state === "rate-limit" ? "rate-limit"
      : result.diagnostic === "TIMEOUT" ? "timeout" : result.diagnostic === "NETWORK" ? "network-error"
        : result.diagnostic === "PARSE" ? "invalid-response" : "upstream-error";
  const code = result.diagnostic?.match(/^(?:HTTP|API) (\d{3})$/)?.[1];
  return { state, httpStatus: code ? Number(code) : undefined, sourceUpdatedAt: result.updatedAt };
}
export function batchObservation(results: PromiseSettledResult<unknown>[]): ApiObservation {
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length === results.length && failures.length) return failureObservation(failures[0].reason);
  return { state: failures.length ? "partial" : "ok" };
}
export function monitoringConfigured() { return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()); }
export function serviceConfigured(service: ApiService) {
  const has = (key: string) => Boolean(process.env[key]?.trim());
  if (service === "icn-flights") return has("DATA_GO_KR_API_KEY");
  if (service === "icn-t1" || service === "icn-t2") return has(service === "icn-t1" ? "ICN_CONGESTION_T1_API_KEY" : "ICN_CONGESTION_T2_API_KEY") || has("DATA_GO_KR_API_KEY");
  if (service === "exchange-koreaexim") return has("KOREAEXIM_API_KEY");
  if (service === "toss") return has("TOSS_PROXY_BASE_URL") && has("TOSS_PROXY_API_KEY");
  if (service === "naver-shopping") return has("NAVER_CLIENT_ID") && has("NAVER_CLIENT_SECRET");
  return true;
}
export function normalizeApiEvent(service: ApiService, observation: ApiObservation, duration: number, now = Date.now()): ApiEvent | null {
  if (!Object.hasOwn(apiServices, service) || !(apiStates as readonly string[]).includes(observation.state)) return null;
  const sourceTime = observation.sourceUpdatedAt ? Date.parse(observation.sourceUpdatedAt) : NaN;
  const delayed = (service === "icn-t1" || service === "icn-t2") && ["ok", "empty"].includes(observation.state) && Number.isFinite(sourceTime) && now - sourceTime > 600000;
  return { service, state: delayed ? "stale" : observation.state, checked_at: new Date(now).toISOString(), duration_ms: Math.max(0, Math.min(300000, Math.round(Number.isFinite(duration) ? duration : 0))),
    http_status: Number.isInteger(observation.httpStatus) && observation.httpStatus! >= 100 && observation.httpStatus! <= 599 ? observation.httpStatus! : null,
    source_updated_at: Number.isFinite(sourceTime) && sourceTime <= now + 300000 ? new Date(sourceTime).toISOString() : null };
}
export const apiStateLabels: Record<ApiState, string> = { ok: "정상", empty: "정상 · 결과 없음", partial: "일부 요청 실패", stale: "자료 갱신 지연", authentication: "인증 실패", "rate-limit": "호출 한도 초과", timeout: "응답 시간 초과", "invalid-response": "응답 형식 오류", "upstream-error": "제공기관 응답 오류", "network-error": "연결 오류" };
export function apiHealthPresentation(service: ApiService, row: ApiHealthRow | undefined, now: number) {
  if (!serviceConfigured(service)) return service === "exchange-koreaexim"
    ? { label: "선택 연동 미설정", tone: "gray" }
    : { label: "API 설정 필요", tone: "amber" };
  if (!row) return { label: "확인 기록 없음", tone: "gray" };
  if (now - Date.parse(row.checked_at) > apiServices[service].idleMinutes * 60000) return { label: "최근 조회 없음", tone: "gray" };
  if ((service === "icn-t1" || service === "icn-t2") && row.source_updated_at && now - Date.parse(row.source_updated_at) > 600000) return { label: "자료 갱신 지연", tone: "amber" };
  return { label: apiStateLabels[row.state], tone: row.state === "ok" || row.state === "empty" ? "green" : row.state === "stale" || row.state === "partial" ? "amber" : "red" };
}
