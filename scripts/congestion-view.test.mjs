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
