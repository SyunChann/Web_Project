import "server-only";

export type AirportTerminal = "T1" | "T2";
export type CongestionGate = {
  id: string; number: number; lane: string;
  waitingPeople: number | null; waitMinutes: number | null; observedAt: string | null;
};
export type CongestionResult = {
  terminal: AirportTerminal;
  state: "ready" | "empty" | "missing-key" | "authentication" | "rate-limit" | "unavailable";
  gates: CongestionGate[];
  diagnostic?: string;
};

const endpoints = {
  T1: "statusOfDepartureCongestion/getDepartureCongestion",
  T2: "statusOfDepartureCongestionT2/getDepartureCongestionT2",
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nonnegative(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

function observation(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value).trim();
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.\d+)?$/);
  if (!compact) return null;
  const [, year, month, day, hour, minute, second] = compact;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return null;
  // Reject calendar overflow rather than silently moving an observation to another day.
  if (new Date(parsed.getTime() + 9 * 3_600_000).toISOString().slice(0, 19) !== `${year}-${month}-${day}T${hour}:${minute}:${second}`) return null;
  return iso;
}

function failure(terminal: AirportTerminal, code: string): CongestionResult {
  const state = /^(20|30|31|32|401|403)$/.test(code) || /SERVICE_KEY|ACCESS_DENIED/.test(code)
    ? "authentication" : /^(22|23|429)$/.test(code) || /LIMIT/.test(code) ? "rate-limit"
      : code === "03" ? "empty" : "unavailable";
  // Only expose fixed numeric codes; upstream messages can contain request details.
  return { terminal, state, gates: [], diagnostic: /^\d+$/.test(code) ? `API ${code}` : undefined };
}

export function parseCongestionResponse(text: string, terminal: AirportTerminal): CongestionResult {
  if (text.trimStart().startsWith("<")) {
    const code = text.match(/<(?:returnReasonCode|resultCode)>\s*([^<]+)\s*<\//i)?.[1]?.trim() ?? "";
    return failure(terminal, code);
  }
  let payload: Record<string, unknown> | null;
  try { payload = record(JSON.parse(text)); } catch { return failure(terminal, ""); }
  const gateway = record(record(payload?.OpenAPI_ServiceResponse)?.cmmMsgHeader);
  if (gateway) return failure(terminal, String(gateway.returnReasonCode ?? ""));
  const response = record(payload?.response);
  const header = record(response?.header);
  if (String(header?.resultCode ?? "") !== "00") return failure(terminal, String(header?.resultCode ?? ""));
  const raw = record(response?.body)?.items;
  const items = Array.isArray(raw) ? raw : record(raw)?.item;
  const rows: unknown[] = Array.isArray(items) ? items : record(items) ? [items] : [];
  const gates = new Map<string, CongestionGate>();
  for (const value of rows) {
    const row = record(value);
    if (!row || typeof row.gateId !== "string") continue;
    const id = row.gateId.trim().toUpperCase();
    const match = id.match(terminal === "T1" ? /^DG([1-6])_([EW])$/ : /^DG([12])_([ABCD])$/);
    if (!match) continue;
    if (row.terminalId && row.terminalId !== (terminal === "T1" ? "P01" : "P03")) continue;
    const gate: CongestionGate = {
      id, number: Number(match[1]), lane: match[2],
      waitingPeople: nonnegative(row.waitLength), waitMinutes: nonnegative(row.waitTime),
      observedAt: observation(row.occurtime),
    };
    const previous = gates.get(id);
    if (!previous || (Date.parse(gate.observedAt ?? "") || 0) > (Date.parse(previous.observedAt ?? "") || 0)) gates.set(id, gate);
  }
  return { terminal, state: gates.size ? "ready" : "empty", gates: [...gates.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}

export async function getDepartureCongestion(terminal: AirportTerminal): Promise<CongestionResult> {
  const dedicatedKey = terminal === "T1" ? process.env.ICN_CONGESTION_T1_API_KEY : process.env.ICN_CONGESTION_T2_API_KEY;
  let key = (dedicatedKey?.trim() || process.env.DATA_GO_KR_API_KEY)?.trim().replace(/^(["'])(.*)\1$/, "$2").trim() ?? "";
  if (!key) return { terminal, state: "missing-key", gates: [] };
  try { key = decodeURIComponent(key); } catch { /* Accept the raw general key too. */ }
  const query = new URLSearchParams({ serviceKey: key, pageNo: "1", numOfRows: "100", type: "json" });
  if (terminal === "T1") query.set("terminalId", "P01");
  try {
    const response = await fetch(`https://apis.data.go.kr/B551177/${endpoints[terminal]}?${query}`, {
      next: { revalidate: 120 }, signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return failure(terminal, String(response.status));
    return parseCongestionResponse(await response.text(), terminal);
  } catch {
    return { terminal, state: "unavailable", gates: [] };
  }
}
