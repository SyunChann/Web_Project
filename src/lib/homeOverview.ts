import type { HomeEntry, HomeGroup } from "@/data/homeFeed";
import type { CongestionResult } from "@/lib/incheonCongestion";
import type { ExchangeRate } from "@/lib/exchangeRateModel";
import { congestionDataState, congestionLaneLabel, congestionLevel, shortestCongestionGates } from "@/lib/congestionPresentation";

export function otherHomeEntries(entries: HomeEntry[], visibleIds: string[]): HomeEntry[] {
  const excluded = new Set(visibleIds);
  const chosen: HomeEntry[] = [];
  const groups: HomeGroup[] = ["content", "restaurants", "travel", "drinks"];
  for (const group of groups) {
    const entry = entries.find((item) => item.group === group && !excluded.has(item.id));
    if (entry) { chosen.push(entry); excluded.add(entry.id); }
    if (chosen.length === 3) return chosen;
  }
  for (const entry of entries) {
    if (!excluded.has(entry.id)) { chosen.push(entry); excluded.add(entry.id); }
    if (chosen.length === 3) break;
  }
  return chosen;
}
export function homeAirportSummary(result: CongestionResult | undefined, now: number) {
  if (!result || result.state !== "ready") return { value: result?.state === "empty" ? "집계 없음" : "조회 지연", detail: "출국 안내에서 확인", level: null };
  const gate = shortestCongestionGates(result, now)[0];
  if (gate) return { value: `${gate.waitMinutes}분`, detail: congestionLaneLabel(result.terminal, gate.number, gate.lane), level: congestionLevel(gate.waitMinutes)?.label ?? null };
  const fresh = result.gates.some((entry) => congestionDataState(entry, now) === "fresh");
  return { value: fresh ? "상세 확인" : "갱신 지연", detail: fresh ? "운영시간·대기 정보 확인" : "최신 수집값 대기", level: null };
}
export function homeRateMovement(rate: ExchangeRate) {
  const percent = rate.changePercent;
  if (percent === null || !Number.isFinite(percent)) return { direction: "unknown" as const, label: "비교 자료 없음", difference: null };
  const previous = rate.points.at(-2);
  const change = previous && Number.isFinite(previous.value) ? rate.value - previous.value : null;
  return { direction: percent > 0 ? "up" as const : percent < 0 ? "down" as const : "flat" as const,
    label: percent === 0 ? "변동 없음" : `${percent > 0 ? "상승" : "하락"} ${Math.abs(percent).toFixed(2)}%`,
    difference: change === null ? null : `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change).toFixed(2)}원` };
}
