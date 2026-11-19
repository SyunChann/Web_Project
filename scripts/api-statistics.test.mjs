import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function load(path, modules = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => modules[name] ?? {} });
  return exports;
}
const monitoring = load("src/lib/apiMonitoringModel.ts");
const model = load("src/lib/apiStatisticsModel.ts", { "@/lib/apiMonitoringModel": monitoring });
const sample = () => ({
  window_start: "2026-11-12T15:00:00Z", window_end: "2026-11-19T02:00:00Z", first_observation_at: "2026-11-12T15:00:00Z",
  daily: [
    { service: "anilist", day: "2026-11-13", total_count: 1, success_count: 1, limited_count: 0, duration_total_ms: 1000, max_duration_ms: 1000 },
    { service: "toss", day: "2026-11-13", total_count: 9, success_count: 7, limited_count: 2, duration_total_ms: 900, max_duration_ms: 100 },
  ], incidents: [],
});

test("KST calendar days retain unobserved gaps and zero-millisecond measurements", () => {
  const data = sample();
  const days = model.summarizeApiDays(data, "all");
  assert.equal(days.length, 7); assert.equal(days[0].day, "2026-11-13"); assert.equal(days[6].day, "2026-11-19");
  assert.equal(model.apiDayRate(days[0]), 80); assert.equal(model.apiDayDuration(days[0]), 190);
  assert.equal(model.apiDayRate(days[1]), null); assert.equal(model.apiDayDuration(days[1]), null);
  assert.equal(model.apiDayDuration({ ...days[0], duration: 0 }), 0);
  assert.equal(model.summarizeApiDays(data, "anilist")[0].total, 1);
  assert.equal(model.summarizeApiDays(data, "icn-t1")[0].total, 0);
});

test("RPC boundary strips extra fields and rejects malformed, excessive and impossible statistics", () => {
  assert.ok(model.parseApiStatistics(sample()));
  const safe = model.parseApiStatistics({ ...sample(), secret: "private-marker" });
  assert.ok(!JSON.stringify(safe).includes("private-marker"));
  for (const value of [null, {}, { ...sample(), window_end: "2027-01-01" }, { ...sample(), first_observation_at: "bad" }, { ...sample(), incidents: Array(501).fill({}) }]) assert.equal(model.parseApiStatistics(value), null);
  for (const changes of [{ day: "2026-99-99" }, { day: "2026-02-31" }, { day: "2026-11-12" }, { service: "unknown" }, { success_count: 2 }, { total_count: -1 }, { duration_total_ms: Infinity }]) {
    const data = sample(); data.daily = [{ ...data.daily[0], ...changes }]; assert.equal(model.parseApiStatistics(data), null, JSON.stringify(changes));
  }
  const duplicate = sample(); duplicate.daily.push(duplicate.daily[0]); assert.equal(model.parseApiStatistics(duplicate), null);
});

test("recovery requires a good state while changes between problems remain problem changes", () => {
  assert.equal(model.incidentKind({ state: "empty", previous_state: "timeout" }), "정상 복귀");
  assert.equal(model.incidentKind({ state: "rate-limit", previous_state: "timeout" }), "문제 상태 변경");
  assert.equal(model.incidentKind({ state: "timeout", previous_state: null }), "문제 관측");
});

test("statistics render accessible charts, daily data and an honest empty-history message", () => {
  const { AdminApiStatistics } = load("src/components/admin/AdminApiStatistics.tsx", {
    react: React, "react/jsx-runtime": jsx, "@/lib/apiMonitoringModel": monitoring, "@/lib/apiStatisticsModel": model,
    "./AdminApiStatistics.module.css": { default: new Proxy({}, { get: (_, name) => String(name) }) },
  });
  const populated = renderToStaticMarkup(React.createElement(AdminApiStatistics, { data: sample() }));
  assert.ok(populated.includes("80.0%") && populated.includes("190ms") && populated.includes('role="img"'));
  assert.ok(populated.includes("일별 수치 보기") && populated.includes("조회 소요") && populated.includes("한국 시간(KST)"));
  const empty = renderToStaticMarkup(React.createElement(AdminApiStatistics, { data: { ...sample(), first_observation_at: null, daily: [] } }));
  assert.ok(empty.includes("관측 기록이 없습니다") && !empty.includes("100.0%"));
});
