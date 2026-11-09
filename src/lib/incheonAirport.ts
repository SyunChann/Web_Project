import "server-only";

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
      totalCount?: number;
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
  const serviceKey = normalizeServiceKey(process.env.DATA_GO_KR_API_KEY);
  if (!serviceKey) return { state: "missing-key", flights: [] };

  const timeWindow = getKoreanTimeWindow();

  try {
    const todayResult = await fetchDepartureItems(serviceKey, timeWindow.date, timeWindow.apiFromTime, "2359");
    if (todayResult.state !== "success") return todayResult;

    const todayFlights = toJapanFlights(todayResult.items, timeWindow.now, timeWindow.endOfDay);
    if (todayFlights.length > 0) {
      return { state: "ready", flights: todayFlights, updatedAt: todayResult.updatedAt, range: "today" };
    }

    const tomorrowResult = await fetchDepartureItems(serviceKey, timeWindow.tomorrowDate, "0000", "0900");
    if (tomorrowResult.state !== "success") return tomorrowResult;

    const tomorrowFlights = toJapanFlights(tomorrowResult.items, timeWindow.tomorrowStart, timeWindow.tomorrowEnd);
    return tomorrowFlights.length > 0
      ? { state: "ready", flights: tomorrowFlights, updatedAt: tomorrowResult.updatedAt, range: "tomorrow-morning" }
      : { state: "empty", flights: [], updatedAt: tomorrowResult.updatedAt };
  } catch {
    console.error("[Incheon Airport API] network or response parsing failed.");
    return { state: "unavailable", flights: [] };
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
    pageNo: "1",
  });
  const response = await fetch(`${DEPARTURES_API_URL}?${query}`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(12_000),
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
      ? { state: "success", items: [], updatedAt: response.headers.get("date") ?? new Date().toISOString() }
      : error;
  }

  const payload = JSON.parse(text) as PublicDataResponse;
  const resultCode = String(payload.response?.header?.resultCode ?? "");
  if (resultCode && resultCode !== "00") {
    const error = mapPublicDataError(resultCode);
    return error.state === "empty"
      ? { state: "success", items: [], updatedAt: response.headers.get("date") ?? new Date().toISOString() }
      : error;
  }

  return {
    state: "success",
    items: getItems(payload.response?.body?.items),
    updatedAt: response.headers.get("date") ?? new Date().toISOString(),
  };
}

function toJapanFlights(items: PublicDepartureItem[], start: number, end: number) {
  return items
    .filter((item) => item.codeshare?.trim().toLowerCase() !== "slave")
    .filter((item) => JAPAN_AIRPORT_CODES.has(item.airportCode?.trim().toUpperCase() ?? ""))
    .map(toBoardFlight)
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

function getItems(items?: PublicDepartureItem[] | { item?: PublicDepartureItem | PublicDepartureItem[] } | "") {
  if (Array.isArray(items)) return items;
  if (!items || typeof items !== "object" || !("item" in items) || !items.item) return [];
  return Array.isArray(items.item) ? items.item : [items.item];
}

function toBoardFlight(item: PublicDepartureItem, index: number): DepartureBoardFlight {
  const scheduledAt = parseKoreanDateTime(item.scheduleDateTime);
  const estimatedAt = parseKoreanDateTime(item.estimatedDateTime);
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

function parseKoreanDateTime(value?: string | number) {
  if (value === undefined || value === null) return undefined;

  const digits = String(value).replace(/\D/g, "");
  if (digits.length >= 12) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T${digits.slice(8, 10)}:${digits.slice(10, 12)}:00+09:00`;
  }

  if (digits.length === 4) {
    const today = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const year = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, "0");
    const day = String(today.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}T${digits.slice(0, 2)}:${digits.slice(2, 4)}:00+09:00`;
  }

  return undefined;
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
  if (normalized === "22" || normalized.includes("LIMIT")) {
    return { state: "rate-limit", flights: [], diagnostic: `OPENAPI ${normalized}` };
  }
  if (["20", "30", "31", "32"].includes(normalized) || normalized.includes("SERVICE_KEY")) {
    return { state: "authentication", flights: [], diagnostic: `OPENAPI ${normalized}` };
  }
  if (["10", "11", "12", "99"].includes(normalized)) {
    return { state: "bad-request", flights: [], diagnostic: `OPENAPI ${normalized}` };
  }

  console.error(`[Incheon Airport API] public-data error (${normalized || "unknown"}).`);
  return { state: "unavailable", flights: [] };
}
