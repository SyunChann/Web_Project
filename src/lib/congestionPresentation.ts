import type { AirportTerminal, CongestionGate, CongestionResult } from "./incheonCongestion";

export function shortestCongestionGates(result: CongestionResult | undefined, now: number): CongestionGate[] {
  if (result?.state !== "ready") return [];
  // A 60+ value is only a lower bound, so it cannot be ranked as an exact wait.
  const candidates = result.gates.filter((gate) => congestionDataState(gate, now) === "fresh"
    && congestionOperatingState(gate.operatingTime, now) === "within"
    && gate.waitMinutes !== null && Number.isFinite(gate.waitMinutes) && gate.waitMinutes >= 0 && !gate.waitOver60);
  if (!candidates.length) return [];
  const minimum = Math.min(...candidates.map((gate) => gate.waitMinutes!));
  return candidates.filter((gate) => gate.waitMinutes === minimum);
}

export function congestionLaneLabel(terminal: AirportTerminal, number: number, lane: string) {
  return terminal === "T2" ? `${number}${lane} 입구` : `${number}번 ${lane === "E" ? "동편" : "서편"}`;
}

export function congestionLevel(minutes: number | null) {
  if (minutes === null) return null;
  if (minutes < 20) return { tone: "smooth", label: "원활" };
  if (minutes < 40) return { tone: "normal", label: "보통" };
  if (minutes < 60) return { tone: "busy", label: "혼잡" };
  return { tone: "veryBusy", label: "매우혼잡" };
}

export function congestionDataState(gate: CongestionGate | undefined, now: number) {
  if (!gate) return "missing";
  if (!gate.observedAt) return "undated";
  const observed = Date.parse(gate.observedAt);
  if (!Number.isFinite(observed) || observed > now + 5 * 60_000) return "undated";
  return now - observed > 10 * 60_000 ? "stale" : "fresh";
}

export function congestionOperatingState(hours: string | null | undefined, now: number) {
  if (!hours || !Number.isFinite(now)) return "unknown";
  const match = hours.match(/^([01]\d|2[0-3]):([0-5]\d)\s*~\s*([01]\d|2[0-3]|24):([0-5]\d)$/);
  if (!match || (match[3] === "24" && match[4] !== "00")) return "unknown";
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  // Equal times are ambiguous; only an explicit 00:00~24:00 means all day.
  if (start === end) return "unknown";
  const koreanTime = new Date(now + 9 * 3_600_000);
  const minute = koreanTime.getUTCHours() * 60 + koreanTime.getUTCMinutes();
  const within = start < end ? minute >= start && minute < end : minute >= start || minute < end;
  return within ? "within" : "outside";
}
