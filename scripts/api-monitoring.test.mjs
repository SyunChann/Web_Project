import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const instant = Date.parse("2026-11-18T03:00:00Z");
function harness(options = {}) {
  let now = instant;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const env = { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "private-fixture-marker", DATA_GO_KR_API_KEY: "upstream-fixture-key", KOREAEXIM_API_KEY: "upstream-fixture-key", TOSS_PROXY_BASE_URL: "https://proxy.invalid", TOSS_PROXY_API_KEY: "upstream-fixture-key", NAVER_CLIENT_ID: "id", NAVER_CLIENT_SECRET: "upstream-fixture-key", ...options.env };
  const afters = [], writes = [], warnings = []; let clients = 0, reads = 0;
  const modules = {
    "next/server": { after: (fn) => { if (options.afterError) throw Error("no request"); afters.push(fn); } },
    "@/lib/admin": { isAdminUser: (user) => user?.email === "admin@example.com" },
    "@supabase/supabase-js": { createClient: () => { clients++; return {
      rpc: async (name, args) => { writes.push({ name, ...args }); return { error: options.writeError ? { message: "private-fixture-marker" } : null }; },
      from: () => ({ select: () => ({ limit: async () => { reads++; return { data: options.rows ?? [], error: options.readError ? {} : null }; } }) }),
    }; } },
  };
  function load(path, extra = {}, extraGlobals = {}) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
      { exports, require: (name) => extra[name] ?? modules[name] ?? {}, process: { env }, Date: Clock, URLSearchParams, AbortSignal, console: { warn: (message) => warnings.push(message), error() {} }, ...extraGlobals });
    return exports;
  }
  const model = load("src/lib/apiMonitoringModel.ts"); modules["@/lib/apiMonitoringModel"] = model;
  const core = load("src/lib/apiMonitoring.ts"); modules["@/lib/apiMonitoring"] = core;
  return { core, model, env, afters, writes, warnings, load, setTime: (time) => { now = time; }, stats: () => ({ clients, reads }) };
}
const admin = { id: "admin", email: "admin@example.com" };
test("normalization only persists fixed operational fields and never response/query/secrets", () => {
  const { model } = harness();
  const event = model.normalizeApiEvent("icn-t1", { state: "authentication", httpStatus: 403, url: "https://api.invalid?key=private-fixture-marker", message: "private-fixture-marker", sourceUpdatedAt: "bad" }, Infinity, instant);
  assert.equal(event.state, "authentication"); assert.equal(event.duration_ms, 0); assert.equal(event.source_updated_at, null); assert.equal(event.http_status, 403);
  assert.ok(!JSON.stringify(event).includes("private-fixture-marker")); assert.equal(Object.keys(event).length, 6);
  assert.equal(model.normalizeApiEvent("unknown", { state: "ok" }, 10, instant), null);
  assert.equal(model.normalizeApiEvent("icn-t1", { state: "invalid-kind" }, 10, instant), null);
});
test("HTTP, timeout, parsing, empty and missing-key outcomes stay distinct", () => {
  const { model } = harness();
  assert.equal(model.httpObservation(401).state, "authentication"); assert.equal(model.httpObservation(429).state, "rate-limit");
  assert.equal(model.failureObservation({ name: "TimeoutError" }).state, "timeout"); assert.equal(model.failureObservation({ name: "SyntaxError" }).state, "invalid-response");
  assert.equal(model.resultObservation({ state: "empty" }).state, "empty"); assert.equal(model.resultObservation({ state: "missing-key" }), null);
  assert.equal(model.batchObservation([{ status: "fulfilled", value: 1 }, { status: "rejected", reason: {} }]).state, "partial");
});
test("no traffic is neutral; stale source data is a separate warning", () => {
  const { model } = harness();
  const row = { state: "ok", checked_at: new Date(instant).toISOString(), source_updated_at: new Date(instant - 11 * 60000).toISOString() };
  assert.equal(model.apiHealthPresentation("icn-t1", row, instant).label, "자료 갱신 지연");
  assert.equal(model.apiHealthPresentation("icn-t1", { ...row, checked_at: new Date(instant - 20 * 60000).toISOString() }, instant).label, "최근 조회 없음");
  assert.equal(model.apiHealthPresentation("anilist", undefined, instant).label, "확인 기록 없음");
});
test("optional official exchange setup is neutral without masking required provider configuration", () => {
  const { model } = harness({ env: { KOREAEXIM_API_KEY: "", DATA_GO_KR_API_KEY: "" } });
  assert.equal(model.apiHealthPresentation("exchange-koreaexim", undefined, instant).label, "선택 연동 미설정");
  assert.equal(model.apiHealthPresentation("exchange-koreaexim", undefined, instant).tone, "gray");
  assert.equal(model.apiHealthPresentation("icn-flights", undefined, instant).label, "API 설정 필요");
});
test("homepage exchange lookup records ECB reads when the optional official key is absent", async () => {
  const h = harness({ env: { KOREAEXIM_API_KEY: "" } }); const urls = [];
  const { getExchangeRateSnapshot } = h.load("src/data/exchangeRates.ts", {}, { fetch: async url => {
    urls.push(url); const base = new URL(url).searchParams.get("base");
    return { ok: true, json: async () => [{ date: "2026-11-17", base, quote: "KRW", rate: 10 }] };
  } });
  assert.equal((await getExchangeRateSnapshot()).source, "frankfurter");
  assert.ok(urls.length > 0 && urls.every(url => !url.includes("koreaexim")));
  await h.afters.shift()(); assert.equal(h.writes[0].p_events.length, 1); assert.equal(h.writes[0].p_events[0].service, "exchange-ecb");
});
test("responses return before persistence; repeated state is throttled and batched", async () => {
  const h = harness();
  assert.equal(await h.core.observeApi("anilist", async () => "ok"), "ok");
  await h.core.observeApi("anilist", async () => "ok");
  await h.core.observeApi("exchange-ecb", async () => "ok");
  assert.equal(h.writes.length, 0); assert.equal(h.afters.length, 1);
  await h.afters.shift()(); assert.equal(h.writes.length, 1); assert.equal(h.writes[0].p_events.length, 2);
  h.setTime(instant + 61000); await h.core.observeApi("anilist", async () => "ok"); assert.equal(h.afters.length, 1);
});
test("bursts preserve successful observation and problem; recovery wins same-millisecond races", async () => {
  const h = harness();
  await h.core.observeApi("anilist", async () => true);
  await h.core.observeApi("anilist", async () => true, () => ({ state: "rate-limit", httpStatus: 429 }));
  await h.afters.shift()(); let events = h.writes[0].p_events;
  assert.equal(events.length, 2); assert.equal(events[0].state, "ok"); assert.equal(events[1].state, "rate-limit"); assert.ok(events[0].checked_at < events[1].checked_at);
  await h.core.observeApi("anilist", async () => true);
  await h.afters.shift()(); events = h.writes[1].p_events; assert.equal(events[0].state, "ok");
  const burst = harness();
  await burst.core.observeApi("anilist", async () => true);
  await burst.core.observeApi("anilist", async () => true, () => ({ state: "timeout" }));
  await burst.core.observeApi("anilist", async () => true);
  await burst.afters.shift()(); assert.equal(burst.writes[0].p_events.at(-1).state, "ok");
});
test("original errors and successful values survive monitoring failures", async () => {
  const h = harness({ afterError: true }); const original = Error("private-fixture-marker");
  await assert.rejects(() => h.core.observeApi("anilist", async () => { throw original; }), (error) => error === original);
  assert.equal(await h.core.observeApi("anilist", async () => 42), 42);
  assert.equal(await h.core.observeApi("anilist", async () => 7, () => { throw Error("classifier failed"); }), 7);
  const failed = harness({ writeError: true }); await failed.core.observeApi("anilist", async () => true); await failed.afters.shift()();
  assert.ok(!JSON.stringify(failed.warnings).includes("private-fixture-marker"));
});
test("admin read is protected before client creation and never probes external providers", async () => {
  const h = harness();
  assert.equal((await h.core.getApiHealth(null)).state, "forbidden"); assert.equal((await h.core.getApiHealth({ email: "member@example.com" })).state, "forbidden"); assert.equal(h.stats().clients, 0);
  assert.equal((await h.core.getApiHealth(admin)).state, "ready"); assert.equal(h.stats().reads, 1); assert.equal(h.afters.length, 0); assert.equal(h.writes.length, 0);
  const missing = harness({ env: { SUPABASE_SERVICE_ROLE_KEY: "" } }); assert.equal((await missing.core.getApiHealth(admin)).state, "unconfigured");
  await missing.core.observeApi("anilist", async () => true); assert.equal(missing.afters.length, 0);
  assert.equal((await harness({ readError: true }).core.getApiHealth(admin)).state, "unavailable");
});
test("admin panel renders safe configuration guidance without service key values", async () => {
  const h = harness();
  const { AdminApiStatus } = h.load("src/components/admin/AdminApiStatus.tsx", {
    "react/jsx-runtime": jsx, "next/link": { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) },
    "./AdminApiRefresh": { AdminApiRefresh: () => React.createElement("button", null, "기록 새로고침") },
    "@/lib/apiMonitoring": { getApiHealth: async () => ({ state: "unconfigured", rows: [] }) },
  });
  const html = renderToStaticMarkup(await AdminApiStatus({ user: admin, now: instant }));
  assert.ok(html.includes("외부 API 운영 현황") && html.includes("기록 저장 설정 필요") && html.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!html.includes("private-fixture-marker") && !html.includes("upstream-fixture-key"));
});
test("official exchange authentication failures preserve the ECB fallback and record both sources", async () => {
  const h = harness(); const observations = [];
  const { getExchangeRateSnapshot } = h.load("src/data/exchangeRates.ts", { "@/lib/apiMonitoring": { observeApi: async (service, operation, classify) => {
    try { const value = await operation(); observations.push({ service, ...classify(value) }); return value; } catch (error) { observations.push({ service, ...h.model.failureObservation(error) }); throw error; }
  } } }, { fetch: async (url) => {
    if (url.includes("koreaexim")) return { ok: true, json: async () => [{ result: 3 }] };
    const base = new URL(url).searchParams.get("base"); return { ok: true, json: async () => [{ date: "2026-11-17", base, quote: "KRW", rate: 10 }] };
  } });
  const result = await getExchangeRateSnapshot(); assert.equal(result.source, "frankfurter"); assert.equal(observations.find((x) => x.service === "exchange-koreaexim").state, "authentication"); assert.equal(observations.find((x) => x.service === "exchange-ecb").state, "ok");
});
test("official exchange uses the API host and compact dates, preserving currency units and source priority", async () => {
  const h = harness(); let requests = 0;
  const { getExchangeRateSnapshot } = h.load("src/data/exchangeRates.ts", {}, { fetch: async raw => {
    const url = new URL(raw); requests++;
    assert.equal(url.origin, "https://oapi.koreaexim.go.kr");
    assert.equal(url.pathname, "/site/program/financial/exchangeJSON");
    assert.match(url.searchParams.get("searchdate"), /^\d{8}$/);
    assert.equal(url.searchParams.get("authkey"), "upstream-fixture-key");
    assert.equal(url.searchParams.get("data"), "AP01");
    return { ok: true, json: async () => [
      { result: 1, cur_unit: "JPY(100)", deal_bas_r: "900.50" },
      { result: 1, cur_unit: "USD", deal_bas_r: "1,400.25" },
    ] };
  } });
  const result = await getExchangeRateSnapshot();
  assert.ok(requests > 0); assert.equal(result.source, "koreaexim");
  assert.equal(result.rates.find(rate => rate.code === "JPY").value, 900.5);
  assert.equal(result.rates.find(rate => rate.code === "USD").value, 1400.25);
  assert.equal(result.rates[0].points.length, 7); assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/);
  await h.afters.shift()(); assert.equal(h.writes[0].p_events.length, 1);
  assert.equal(h.writes[0].p_events[0].service, "exchange-koreaexim"); assert.equal(h.writes[0].p_events[0].state, "ok");
});
test("official exchange connection failures still serve ECB and preserve the real failure state", async () => {
  const h = harness();
  const { getExchangeRateSnapshot } = h.load("src/data/exchangeRates.ts", {}, { fetch: async raw => {
    const url = new URL(raw);
    if (url.hostname === "oapi.koreaexim.go.kr") throw new TypeError("fetch failed");
    return { ok: true, json: async () => [{ date: "2026-11-17", base: url.searchParams.get("base"), quote: "KRW", rate: 10 }] };
  } });
  assert.equal((await getExchangeRateSnapshot()).source, "frankfurter");
  await h.afters.shift()();
  assert.equal(h.writes[0].p_events.find(event => event.service === "exchange-koreaexim").state, "network-error");
  assert.equal(h.writes[0].p_events.find(event => event.service === "exchange-ecb").state, "ok");
});
