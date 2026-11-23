import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function load(file, modules = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: (name) => {
    if (!(name in modules)) throw Error(`Unexpected import ${name}`);
    return modules[name];
  } });
  return exports;
}
const now = Date.parse("2026-11-23T10:00:00+09:00");
const presentation = load("src/lib/congestionPresentation.ts");
const { DepartureCongestion } = load("src/app/departures/DepartureCongestion.tsx", {
  react: React, "react/jsx-runtime": jsx,
  "@/lib/congestionPresentation": presentation,
  "./DepartureLive": { useDepartureTime: () => now, useDepartureRefreshPending: () => false },
  "./DepartureCongestion.module.css": { default: new Proxy({}, { get: (_, key) => String(key) }) },
});
const gate = { id: "test", number: 1, lane: "E", waitingPeople: 123456, waitMinutes: 17, observedAt: new Date(now).toISOString(), waitOver60: true, operatingTime: null };
function render(overrides = {}) {
  return renderToStaticMarkup(React.createElement(DepartureCongestion, { results: [{ terminal: "T1", state: "ready", gates: [{ ...gate, ...overrides }] }] }));
}
test("mobile summary preserves per-entrance counts, over-60 labels and zero values without combining entrances", () => {
  assert.ok(render().includes("123,456명"));
  assert.ok(render().includes("17분 초과"));
  assert.ok(render({ waitingPeople: 0, waitMinutes: 0, waitOver60: false }).includes("0명"));
  assert.ok(render().includes('aria-controls="congestion-T1-1"'));
  assert.ok(render().includes('aria-expanded="false"'));
});
test("mobile summary and expanded view both suppress old, invalid-time, and closed-entrance counts", () => {
  for (const [overrides, message] of [
    [{ observedAt: new Date(now - 600001).toISOString() }, "갱신 지연"],
    [{ observedAt: "invalid" }, "수집 시각 확인 필요"],
    [{ operatingTime: "12:00~18:00" }, "운영시간 기준 미운영"],
  ]) {
    const html = render(overrides);
    assert.ok(html.includes(message), message);
    assert.ok(!html.includes("123,456명"), message);
    assert.ok(!html.includes("17분 초과"), message);
  }
});
test("collapsed entrances show the existing congestion level only for current waiting-time data", () => {
  const compact = (html) => html.split('class="compactLanes"')[1].split('class="laneDetails"')[0];
  for (const [waitMinutes, label] of [[0, "원활"], [19, "원활"], [20, "보통"], [40, "혼잡"], [60, "매우혼잡"]]) {
    assert.ok(compact(render({ waitMinutes })).includes(label), label);
  }
  for (const overrides of [
    { waitMinutes: null },
    { observedAt: new Date(now - 600001).toISOString() },
    { operatingTime: "12:00~18:00" },
  ]) {
    assert.ok(!compact(render(overrides)).includes('class="level'), JSON.stringify(overrides));
  }
});

test("shortest-wait emphasis requires confirmed hours and disappears for closed or stale data", () => {
  const html = render({ operatingTime: "06:00~22:00", waitMinutes: 0, waitOver60: false });
  assert.ok(html.includes('aria-label="대기가 짧은 입구"'));
  assert.ok(html.includes("T1 · 대기가 짧은 입구 · 0분"));
  assert.ok(html.includes('data-recommended="true"'));
  for (const overrides of [{}, { operatingTime: "12:00~18:00" }, { operatingTime: "06:00~22:00", observedAt: new Date(now - 600001).toISOString() }]) {
    assert.ok(!render(overrides).includes('aria-label="대기가 짧은 입구"'));
  }
});

test("shortest-wait comparison returns all ties, excludes unknown and non-comparable metrics, and never crosses terminals", () => {
  const base = { ...gate, operatingTime: "06:00~22:00", waitMinutes: 5, waitOver60: false };
  const fast = { ...base, id: "fast", number: 2, lane: "W", waitMinutes: 0 };
  const tie = { ...fast, id: "tie", number: 3 };
  const invalid = [
    { ...base, id: "closed", operatingTime: "12:00~18:00", waitMinutes: 0 },
    { ...base, id: "unknown", operatingTime: null, waitMinutes: 0 },
    { ...base, id: "old", observedAt: new Date(now - 600001).toISOString(), waitMinutes: 0 },
    { ...base, id: "missing", waitMinutes: null },
    { ...base, id: "infinite", waitMinutes: Infinity },
    { ...base, id: "negative", waitMinutes: -1 },
    { ...base, id: "lower-bound", waitMinutes: 0, waitOver60: true },
  ];
  const result = { terminal: "T1", state: "ready", gates: [base, fast, tie, ...invalid] };
  assert.deepEqual(Array.from(presentation.shortestCongestionGates(result, now), (entry) => entry.id), ["fast", "tie"]);
  assert.equal(presentation.shortestCongestionGates({ ...result, state: "unavailable" }, now).length, 0);
  assert.equal(presentation.shortestCongestionGates(undefined, now).length, 0);
  assert.equal(presentation.shortestCongestionGates({ terminal: "T2", state: "ready", gates: [base] }, now)[0].id, "test");
});
