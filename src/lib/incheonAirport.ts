import "server-only";
import { observeApi } from "@/lib/apiMonitoring";
import { resultObservation } from "@/lib/apiMonitoringModel";

const DEPARTURES_API_URL =
  "https://apis.data.go.kr/B551177/StatusOfPassengerFlightsDeOdp/getPassengerDeparturesDeOdp";

const JAPAN_AIRPORT_CODES = new Set([
  "AKJ", "AOJ", "ASJ", "AXT", "CTS", "FKS", "FSZ", "FUJ", "FUK", "GAJ", "HAC", "HIJ", "HKD", "HND",
  "HSG", "IBR", "ISG", "ITM", "IWJ", "IZO", "KCZ", "KIJ", "KIX", "KKJ", "KMQ", "KOJ", "KUH", "KMJ",
  "KMI", "MMB", "MMJ", "MSJ", "MYJ", "NGO", "NGS", "NKM", "NRT", "OBO", "OIT", "OKA", "OKJ", "ONJ",
  "OSA", "SDJ", "SHB", "TAK", "TOY", "TKS", "TTJ", "UBJ", "UKB", "YGJ",
]);

type PublicDepartureItem = {
  airline?: string;
  flightId?: string;
  scheduleDateTime?: string | number;
  estimatedDateTime?: string | number;
  airport?: string;
  airportCode?: string;
  terminalid?: string;
  gatenumber?: string | number;
  remark?: string;
  codeshare?: string;
};

type PublicDataResponse = {
  response?: {
    header?: {
      resultCode?: string | number;
      resultMsg?: string;
    };
    body?: {
      items?: PublicDepartureItem[] | { item?: PublicDepartureItem | PublicDepartureItem[] } | "";
      totalCount?: number | string;
    };
  };
};

export type DepartureStatusTone = "scheduled" | "delayed" | "boarding" | "departed" | "canceled";

export type DepartureBoardFlight = {
  id: string;
  number: string;
  airline: string;
  destination: string;
  destinationCode: string;
  scheduledAt?: string;
  revisedAt?: string;
  terminal: string;
  gate: string;
  status: string;
  statusTone: DepartureStatusTone;
};

export type DepartureBoardResult =
  | { state: "ready"; flights: DepartureBoardFlight[]; updatedAt: string; range: "today" | "tomorrow-morning" }
  | { state: "empty"; flights: []; updatedAt: string }
  | {
      state: "missing-key" | "rate-limit" | "authentication" | "bad-request" | "unavailable";
      flights: [];
      updatedAt?: string;
      diagnostic?: string;
    };

type DepartureBoardServiceError = {
  state: "rate-limit" | "authentication" | "bad-request" | "unavailable";
  flights: [];
  updatedAt?: string;
  diagnostic?: string;
};

type PublicDepartureFetchResult =
  | { state: "success"; items: PublicDepartureItem[]; updatedAt: string }
  | DepartureBoardServiceError;

export async function getJapanDepartures(): Promise<DepartureBoardResult> {
  return observeApi("icn-flights", loadJapanDepartures, resultObservation);
}
async function loadJapanDepartures(): Promise<DepartureBoardResult> {
  const serviceKey = normalizeServiceKey(process.env.DATA_GO_KR_API_KEY);
  if (!serviceKey) return { state: "missing-key", flights: [] };

  const timeWindow = getKoreanTimeWindow();

  try {
    const todayResult = await fetchDepartureItems(serviceKey, timeWindow.date, timeWindow.apiFromTime, "2359");
    if (todayResult.state !== "success") return todayResult;

    const todayFlights = toJapanFlights(todayResult.items, timeWindow.now, timeWindow.endOfDay, timeWindow.date);
    if (todayFlights.length > 0) {
      return { state: "ready", flights: todayFlights, updatedAt: todayResult.updatedAt, range: "today" };
    }

    const tomorrowResult = await fetchDepartureItems(serviceKey, timeWindow.tomorrowDate, "0000", "0900");
    if (tomorrowResult.state !== "success") return tomorrowResult;

    const tomorrowFlights = toJapanFlights(tomorrowResult.items, timeWindow.tomorrowStart, timeWindow.tomorrowEnd, timeWindow.tomorrowDate);
    return tomorrowFlights.length > 0
      ? { state: "ready", flights: tomorrowFlights, updatedAt: tomorrowResult.updatedAt, range: "tomorrow-morning" }
      : { state: "empty", flights: [], updatedAt: tomorrowResult.updatedAt };
  } catch (error) {
    console.error("[Incheon Airport API] network or response parsing failed.");
    const name = error && typeof error === "object" && "name" in error ? error.name : "";
    return { state: "unavailable", flights: [], diagnostic: name === "TimeoutError" || name === "AbortError" ? "TIMEOUT" : name === "SyntaxError" ? "PARSE" : "NETWORK" };
  }
}

function getKoreanTimeWindow(now = new Date()) {
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = koreaTime.getUTCFullYear();
  const month = String(koreaTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(koreaTime.getUTCDate()).padStart(2, "0");
  const hour = String(koreaTime.getUTCHours()).padStart(2, "0");
  const minute = koreaTime.getUTCMinutes();
  const apiMinute = String(Math.floor(minute / 5) * 5).padStart(2, "0");
  const tomorrow = new Date(koreaTime.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowYear = tomorrow.getUTCFullYear();
  const tomorrowMonth = String(tomorrow.getUTCMonth() + 1).padStart(2, "0");
  const tomorrowDay = String(tomorrow.getUTCDate()).padStart(2, "0");
  const tomorrowDate = `${tomorrowYear}${tomorrowMonth}${tomorrowDay}`;

  return {
    date: `${year}${month}${day}`,
    apiFromTime: `${hour}${apiMinute}`,
    now: now.getTime(),
    endOfDay: Date.parse(`${year}-${month}-${day}T23:59:59.999+09:00`),
    tomorrowDate,
    tomorrowStart: Date.parse(`${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}T00:00:00+09:00`),
    tomorrowEnd: Date.parse(`${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}T09:00:59.999+09:00`),
  };
}

async function fetchDepartureItems(
  serviceKey: string,
  date: string,
  fromTime: string,
  toTime: string,
): Promise<PublicDepartureFetchResult> {
  const items: PublicDepartureItem[] = [];
  const seenPages = new Set<string>();
  const signal = AbortSignal.timeout(20_000);
  let updatedAt = "";
  let expectedCount: number | undefined;
  // Bound unexpected upstream pagination without ever presenting partial results as complete.
  for (let page = 1; page <= 20; page++) {
    const result = await fetchDeparturePage(serviceKey, date, fromTime, toTime, page, signal);
    if (result.state !== "success") return result;
    if (result.totalCount !== undefined) {
      if (expectedCount !== undefined && expectedCount !== result.totalCount) return { state: "unavailable", flights: [] };
      expectedCount = result.totalCount;
    }
    if (!updatedAt) updatedAt = result.updatedAt;
    const fingerprint = JSON.stringify(result.items);
    if (result.items.length && seenPages.has(fingerprint)) return { state: "unavailable", flights: [] };
    seenPages.add(fingerprint);
    items.push(...result.items);
    if (expectedCount !== undefined) {
      if (items.length > expectedCount) return { state: "unavailable", flights: [] };
      if (items.length === expectedCount) return { state: "success", items, updatedAt };
      if (!result.items.length) return { state: "unavailable", flights: [] };
    } else if (result.items.length < 500) {
      return { state: "success", items, updatedAt };
    }
  }
  return { state: "unavailable", flights: [] };
}

async function fetchDeparturePage(
  serviceKey: string, date: string, fromTime: string, toTime: string, page: number, signal: AbortSignal,
): Promise<(Extract<PublicDepartureFetchResult, { state: "success" }> & { totalCount?: number }) | DepartureBoardServiceError> {
  const query = new URLSearchParams({
    serviceKey,
    type: "json",
    searchday: date,
    from_time: fromTime,
    to_time: toTime,
    airport_code: "",
    f_id: "",
    flight_id: "",
    inqtimechcd: "E",
    lang: "K",
    numOfRows: "500",
    pageNo: String(page),
  });
  const response = await fetch(`${DEPARTURES_API_URL}?${query}`, {
    next: { revalidate: 300 },
    signal,
  });

  if (response.status === 429) return { state: "rate-limit", flights: [], diagnostic: "HTTP 429" };
  if (response.status === 401 || response.status === 403) {
    return { state: "authentication", flights: [], diagnostic: `HTTP ${response.status}` };
  }
  if (!response.ok) {
    console.error(`[Incheon Airport API] upstream request failed (${response.status}).`);
    return {
      state: response.status < 500 ? "bad-request" : "unavailable",
      flights: [],
      diagnostic: `HTTP ${response.status}`,
    };
  }

  const text = await response.text();
  if (text.trimStart().startsWith("<")) {
    const error = mapPublicDataError(readXmlErrorCode(text));
    return error.state === "empty"
      ? { state: "success", items: [], totalCount: page === 1 ? 0 : undefined, updatedAt: validResponseDate(response.headers.get("date")) }
      : error;
  }

  const payload = JSON.parse(text) as PublicDataResponse & {
    OpenAPI_ServiceResponse?: { cmmMsgHeader?: { returnReasonCode?: string } };
  };
  if (!payload || typeof payload !== "object") return { state: "unavailable", flights: [] };
  const gatewayCode = payload.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnReasonCode;
  if (gatewayCode) {
    const error = mapPublicDataError(String(gatewayCode));
    return error.state === "empty"
      ? { state: "success", items: [], totalCount: page === 1 ? 0 : undefined, updatedAt: new Date().toISOString() }
      : error;
  }
  const resultCode = String(payload.response?.header?.resultCode ?? "");
  if (resultCode !== "00") {
    const error = mapPublicDataError(resultCode);
    return error.state === "empty"
      ? { state: "success", items: [], totalCount: page === 1 ? 0 : undefined, updatedAt: validResponseDate(response.headers.get("date")) }
      : error;
  }

  const body = payload.response?.body;
  if (!body || typeof body !== "object") return { state: "unavailable", flights: [] };
  const count = body.totalCount;
  const totalCount = count === undefined ? undefined : Number(count);
  if (count !== undefined && ((typeof count !== "number" && typeof count !== "string") || String(count).trim() === ""
    || !Number.isSafeInteger(totalCount) || totalCount! < 0)) return { state: "unavailable", flights: [] };
  const items = getItems(body.items, totalCount);
  if (!items || (totalCount === 0 && items.length > 0)) return { state: "unavailable", flights: [] };
  return {
    state: "success",
    items, totalCount,
    updatedAt: validResponseDate(response.headers.get("date")),
  };
}

function validResponseDate(value: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : new Date().toISOString();
}

function toJapanFlights(items: PublicDepartureItem[], start: number, end: number, date: string) {
  return items
    .filter((item) => item.codeshare?.trim().toLowerCase() !== "slave")
    .filter((item) => JAPAN_AIRPORT_CODES.has(item.airportCode?.trim().toUpperCase() ?? ""))
    .map((item, index) => toBoardFlight(item, index, date))
    .filter((flight) => isWithinTimeWindow(flight, start, end))
    .sort((a, b) => getSortTime(a) - getSortTime(b));
}

function normalizeServiceKey(value?: string) {
  if (!value) return "";

  const normalized = value.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
}

function getItems(items: unknown, totalCount?: number): PublicDepartureItem[] | null {
  if ((items === "" || items == null) && totalCount === 0) return [];
  const wrapped = items && typeof items === "object" && "item" in items ? items.item : items;
  if ((wrapped === "" || wrapped == null) && totalCount === 0) return [];
  const rows = Array.isArray(wrapped) ? wrapped : wrapped && typeof wrapped === "object" ? [wrapped] : null;
  if (!rows) return null;
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    if (!["airline", "flightId", "airport", "airportCode", "terminalid", "remark", "codeshare"].every(
      (key) => row[key] == null || typeof row[key] === "string")) return null;
    if (!["scheduleDateTime", "estimatedDateTime", "gatenumber"].every(
      (key) => row[key] == null || typeof row[key] === "string" || typeof row[key] === "number")) return null;
    if (!row.flightId || !row.airportCode || row.scheduleDateTime == null || row.scheduleDateTime === "") return null;
  }
  return rows;
}

function toBoardFlight(item: PublicDepartureItem, index: number, date: string): DepartureBoardFlight {
  const scheduledAt = parseKoreanDateTime(item.scheduleDateTime, date);
  const scheduledDate = scheduledAt?.slice(0, 10).replaceAll("-", "") ?? date;
  let estimatedAt = parseKoreanDateTime(item.estimatedDateTime, scheduledDate);
  // A time-only estimate after midnight belongs to the next day for a late-night flight.
  if (scheduledAt && estimatedAt && isTimeOnly(item.estimatedDateTime)
    && Date.parse(scheduledAt) - Date.parse(estimatedAt) > 12 * 3_600_000) {
    estimatedAt = new Date(Date.parse(estimatedAt) + 24 * 3_600_000).toISOString();
  }
  const status = normalizeStatus(item.remark);

  return {
    id: `${item.flightId ?? "flight"}-${scheduledAt ?? index}`,
    number: item.flightId?.trim() || "-",
    airline: item.airline?.trim() || "항공사 정보 없음",
    destination: item.airport?.trim() || "목적지 정보 없음",
    destinationCode: item.airportCode?.trim().toUpperCase() || "-",
    scheduledAt,
    revisedAt: estimatedAt && estimatedAt !== scheduledAt ? estimatedAt : undefined,
    terminal: normalizeTerminal(item.terminalid),
    gate: String(item.gatenumber ?? "").trim() || "-",
    status: status.label,
    statusTone: status.tone,
  };
}

function parseKoreanDateTime(value: string | number | undefined, date: string) {
  if (value === undefined || value === null) return undefined;

  const raw = String(value).trim();
  const time = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  const formatted = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\+09:00)?$/);
  const compact = typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2359
    ? raw.padStart(4, "0") : raw;
  const digits = time ? `${date}${time[1]}${time[2]}${time[3] ?? "00"}`
    : formatted ? formatted.slice(1).map((part) => part ?? "00").join("")
      : /^\d{4}$/.test(compact) ? `${date}${compact}` : compact;
  if (!/^(?:\d{12}|\d{14})$/.test(digits)) return undefined;
  const local = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T${digits.slice(8, 10)}:${digits.slice(10, 12)}:${digits.slice(12, 14) || "00"}`;
  const parsed = Date.parse(`${local}+09:00`);
  if (!Number.isFinite(parsed) || new Date(parsed + 9 * 3_600_000).toISOString().slice(0, 19) !== local) return undefined;
  return `${local}+09:00`;
}

function isTimeOnly(value: string | number | undefined) {
  return typeof value === "number" ? Number.isInteger(value) && value >= 0 && value <= 2359
    : /^(?:\d{4}|\d{2}:\d{2}(?::\d{2})?)$/.test(value?.trim() ?? "");
}

function normalizeTerminal(value?: string) {
  const terminal = value?.trim().toUpperCase();
  const labels: Record<string, string> = {
    P01: "T1",
    P02: "탑승동",
    P03: "T2",
    T1: "T1",
    T2: "T2",
  };
  return terminal ? labels[terminal] ?? terminal : "-";
}

function normalizeStatus(remark?: string): { label: string; tone: DepartureStatusTone } {
  const value = remark?.trim().replace(/\s/g, "") ?? "";
  if (/결항|취소/.test(value)) return { label: "결항", tone: "canceled" };
  if (/지연/.test(value)) return { label: "지연", tone: "delayed" };
  if (/탑승중|탑승개시|최종탑승|탑승마감|게이트마감/.test(value)) {
    return { label: /마감/.test(value) ? "탑승 마감" : "탑승 중", tone: "boarding" };
  }
  if (/출발/.test(value) && !/출발준비|출발예정/.test(value)) return { label: "출발", tone: "departed" };
  if (/수속|체크인/.test(value)) return { label: "수속 중", tone: "scheduled" };
  return { label: remark?.trim() || "예정", tone: "scheduled" };
}

function getSortTime(flight: DepartureBoardFlight) {
  const value = flight.revisedAt ?? flight.scheduledAt;
  if (!value) return Number.MAX_SAFE_INTEGER;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function isWithinTimeWindow(flight: DepartureBoardFlight, start: number, end: number) {
  const departureTime = getSortTime(flight);
  return departureTime >= start && departureTime <= end;
}

function readXmlErrorCode(xml: string) {
  return xml.match(/<(?:returnReasonCode|resultCode)>\s*([^<]+)\s*<\//i)?.[1]?.trim() ?? "";
}

function mapPublicDataError(code: string): DepartureBoardServiceError | { state: "empty"; flights: []; updatedAt: string } {
  const normalized = code.trim().toUpperCase();
  if (normalized === "03") return { state: "empty", flights: [], updatedAt: new Date().toISOString() };
  const diagnostic = /^\d+$/.test(normalized) ? `OPENAPI ${normalized}` : undefined;
  if (["22", "23"].includes(normalized) || normalized.includes("LIMIT")) {
    return { state: "rate-limit", flights: [], diagnostic };
  }
  if (["20", "30", "31", "32"].includes(normalized) || normalized.includes("SERVICE_KEY")) {
    return { state: "authentication", flights: [], diagnostic };
  }
  if (["10", "11", "12", "99"].includes(normalized)) {
    return { state: "bad-request", flights: [], diagnostic };
  }

  console.error("[Incheon Airport API] invalid public-data response.");
  return { state: "unavailable", flights: [] };
}
