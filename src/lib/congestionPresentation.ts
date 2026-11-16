import type { AirportTerminal, CongestionGate } from "./incheonCongestion";

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
