import "server-only";
import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/admin";
import type { User } from "@supabase/supabase-js";
import { failureObservation, monitoringConfigured, normalizeApiEvent, type ApiService, type ApiObservation, type ApiEvent, type ApiHealthRow } from "@/lib/apiMonitoringModel";
import { parseApiStatistics, type ApiStatisticsResult } from "@/lib/apiStatisticsModel";

const pending = new Map<string, ApiEvent>();
const lastQueued = new Map<ApiService, { at: number; state: string; checkedAt: number }>();
let scheduled = false;
function client() {
  if (!monitoringConfigured()) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(3000), cache: "no-store" }) },
  });
}
function queue(event: ApiEvent) {
  if (!monitoringConfigured()) return;
  const now = Date.now(), fingerprint = `${event.state}:${event.http_status ?? ""}`;
  const previous = lastQueued.get(event.service);
  if (previous?.state === fingerprint && now - previous.at < 60000) return;
  const checkedAt = Math.max(Date.parse(event.checked_at), (previous?.checkedAt ?? 0) + 1);
  event = { ...event, checked_at: new Date(checkedAt).toISOString() };
  // Keep both the latest successful read and latest problem during a burst.
  if (["ok", "empty", "partial"].includes(event.state)) pending.set(`${event.service}:success`, event);
  if (!["ok", "empty"].includes(event.state)) pending.set(`${event.service}:problem`, event);
  lastQueued.set(event.service, { at: now, state: fingerprint, checkedAt });
  if (scheduled) return;
  scheduled = true;
  try {
    after(async () => {
      const events = [...new Set(pending.values())].sort((a, b) => a.checked_at.localeCompare(b.checked_at)); pending.clear(); scheduled = false;
      try {
        const db = client();
        if (!db) return;
        const { error } = await db.rpc("record_api_observations_v1", { p_events: events });
        if (error) throw Error("monitor storage unavailable");
      } catch {
        events.forEach((e) => lastQueued.delete(e.service));
        // Never log upstream URLs, query strings, response bodies or credentials.
        console.warn("[API monitoring] 기록 저장 실패");
      }
    });
  } catch { scheduled = false; pending.clear(); lastQueued.delete(event.service); }
}
export async function observeApi<T>(service: ApiService, operation: () => Promise<T>, classify: (value: T) => ApiObservation | null = () => ({ state: "ok" })): Promise<T> {
  const started = Date.now();
  let value: T;
  try {
    value = await operation();
  } catch (error) {
    try { const event = normalizeApiEvent(service, failureObservation(error), Date.now() - started); if (event) queue(event); } catch { /* Preserve the original failure. */ }
    throw error;
  }
  try { const observation = classify(value); if (observation) { const event = normalizeApiEvent(service, observation, Date.now() - started); if (event) queue(event); } } catch { /* Preserve successful service responses if monitoring fails. */ }
  return value;
}
export async function getApiHealth(user: User | null) {
  if (!isAdminUser(user)) return { state: "forbidden" as const, rows: [] as ApiHealthRow[] };
  if (!monitoringConfigured()) return { state: "unconfigured" as const, rows: [] as ApiHealthRow[] };
  try {
    const db = client()!;
    const { data, error } = await db.from("api_service_health").select("service,state,checked_at,duration_ms,http_status,source_updated_at,last_success_at,last_error_at,last_error_state").limit(10);
    return { state: error ? "unavailable" as const : "ready" as const, rows: (error ? [] : data ?? []) as ApiHealthRow[] };
  } catch { return { state: "unavailable" as const, rows: [] as ApiHealthRow[] }; }
}

export async function getApiStatistics(user: User | null): Promise<ApiStatisticsResult> {
  if (!isAdminUser(user)) return { state: "forbidden", data: null };
  if (!monitoringConfigured()) return { state: "unconfigured", data: null };
  try {
    const { data, error } = await client()!.rpc("get_api_operation_stats_v1");
    const parsed = error ? null : parseApiStatistics(data);
    return parsed ? { state: "ready", data: parsed } : { state: "unavailable", data: null };
  } catch { return { state: "unavailable", data: null }; }
}
