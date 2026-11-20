import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "lucide-react";

function load(file, modules = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: (name) => {
    if (!(name in modules)) throw Error(`Unmocked module ${name}`);
    return modules[name];
  }, URLSearchParams, AbortSignal, process: { env: {} }, ...globals });
  return exports;
}
const model = load("src/lib/exchangeRateModel.ts");
const row = (code, value) => ({ result: 1, cur_unit: code, deal_bas_r: value });
const days = [
  { date: "2026-11-19", rows: [row("JPY(100)", "900"), row("USD", "1,400"), row("EUR", "1,500"), row("IDR(100)", "9")] },
  { date: "2026-11-20", rows: [row("JPY(100)", "909"), row("USD", "1,386"), row("EUR", "1,500"), row("IDR(100)", "9.5"), row("KRW", "1"), row("XXX", "0"), row("ZZZ", "NaN")] },
];

test("all valid official currencies are retained with consistent dates, units and prior-publication changes", () => {
  const rates = model.buildKoreaEximRates([...days].reverse());
  assert.deepEqual(Array.from(rates, (r) => r.code), ["JPY", "USD", "EUR", "IDR"]);
  const jpy = rates[0];
  assert.equal(jpy.unit, 100); assert.equal(jpy.value, 909); assert.equal(jpy.changePercent, 1);
  assert.equal(rates[1].changePercent, -1); assert.equal(rates[2].changePercent, 0);
  assert.equal(rates[3].unit, 100);
  assert.ok(rates.every((r) => r.points.at(-1).date === "2026-11-20"));
});
test("empty holiday responses do not erase data; stale or invalid currencies are not mixed into the latest list", () => {
  const rates = model.buildKoreaEximRates([...days, { date: "2026-11-21", rows: [] }]);
  assert.equal(rates.length, 4);
  const partial = model.buildKoreaEximRates([...days, { date: "2026-11-21", rows: [row("EUR", "1501")] }]);
  assert.deepEqual(Array.from(partial, (r) => r.code), ["EUR"]);
  for (const code of ["KRW", "JPY(0)", "JPY(100000)", "bad", "EUR<script>"]) assert.equal(model.parseCurrencyUnit(code), null);
});
test("graph points are sorted, deduplicated and limited to seven publications; single-point comparison is unknown", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, "0")}`, rows: [row("JPY(100)", String(900 + i))] }));
  const [rate] = model.buildKoreaEximRates([...rows, rows[3]]);
  assert.equal(rate.points.length, 7); assert.equal(rate.points[0].date, "2026-11-06");
  assert.equal(model.buildKoreaEximRates([days[0]])[0].changePercent, null);
});
test("ECB KRW-base quotes are inverted exactly once and 100-unit quotes stay comparable to Korea Exim", () => {
  const rates = model.buildFrankfurterRates([
    { date: "2026-11-20", base: "KRW", quote: "JPY", rate: 0.1 },
    { date: "2026-11-20", base: "KRW", quote: "USD", rate: 0.0008 },
    { date: "2026-11-20", base: "KRW", quote: "EUR", rate: 0.000625 },
    { date: "2026-11-20", base: "USD", quote: "KRW", rate: 9999 },
    { date: "2026-11-20", base: "KRW", quote: "BAD", rate: 0 },
  ]);
  assert.equal(rates[0].value, 1000); assert.equal(rates[1].value, 1250); assert.equal(rates[2].value, 1600);
  assert.equal(model.convertCurrency("100", rates[0], "to-krw"), 1000);
});
test("conversion honors quote units in both directions and refuses malformed or excessive inputs", () => {
  const rate = { value: 900.5, unit: 100 };
  assert.equal(model.convertCurrency("100", rate, "to-krw"), 900.5);
  assert.equal(model.convertCurrency("900.5", rate, "from-krw"), 100);
  assert.equal(model.convertCurrency("0", rate, "to-krw"), 0);
  for (const amount of ["", "-1", "Infinity", "NaN", "1e9", "1234567890123", "0.1234567", "<script>"]) assert.equal(model.convertCurrency(amount, rate, "to-krw"), null);
  assert.equal(model.convertCurrency("100", { value: 0, unit: 100 }, "to-krw"), null);
});
test("official keys stay server-side and the same cached request supplies all currencies without per-currency requests", async () => {
  const calls = [];
  const data = load("src/data/exchangeRates.ts", {
    "@/lib/exchangeRateModel": model,
    "@/lib/apiMonitoring": { observeApi: async (_, operation) => operation() },
    "@/lib/apiMonitoringModel": { ApiRequestError: Error, httpObservation: () => ({ state: "network-error" }) },
  }, { process: { env: { KOREAEXIM_API_KEY: "private-test-key" } }, fetch: async (raw, options) => {
    calls.push({ url: new URL(raw), options }); return { ok: true, json: async () => days[1].rows };
  } });
  const snapshot = await data.getExchangeRateSnapshot();
  assert.equal(calls.length, 16); assert.equal(snapshot.rates.length, 4);
  assert.ok(calls.every(({ url, options }) => url.searchParams.get("data") === "AP01" && options.next.revalidate === 21600));
  assert.ok(!JSON.stringify(snapshot).includes("private-test-key"));
});
test("ECB fallback is a single cached request explicitly scoped to ECB and both providers failing returns null", async () => {
  const calls = [];
  const modules = { "@/lib/exchangeRateModel": model, "@/lib/apiMonitoring": { observeApi: async (_, operation) => operation() }, "@/lib/apiMonitoringModel": { ApiRequestError: Error, httpObservation: () => ({ state: "network-error" }) } };
  const data = load("src/data/exchangeRates.ts", modules, { fetch: async (raw, options) => {
    calls.push({ url: new URL(raw), options }); return { ok: true, json: async () => [
      { date: "2026-11-20", base: "KRW", quote: "JPY", rate: 0.1 }, { date: "2026-11-20", base: "KRW", quote: "USD", rate: 0.001 },
    ] };
  } });
  assert.equal((await data.getExchangeRateSnapshot()).source, "frankfurter");
  assert.equal(calls.length, 1); assert.equal(calls[0].url.searchParams.get("providers"), "ecb");
  assert.equal(calls[0].options.next.revalidate, 3600);
  let failedRequests = 0;
  const failed = load("src/data/exchangeRates.ts", modules, { fetch: async () => { failedRequests++; throw Error("private-test-key"); } });
  assert.equal(await failed.getExchangeRateSnapshot(), null);
  assert.equal(failedRequests, 1);
});
test("explorer renders accessible calculator, searchable currencies, chart and a clear fallback notice", () => {
  const { ExchangeRateExplorer } = load("src/components/exchange/ExchangeRateExplorer.tsx", {
    react: React, "react/jsx-runtime": jsx, "lucide-react": icons, "@/lib/exchangeRateModel": model,
  });
  const html = renderToStaticMarkup(React.createElement(ExchangeRateExplorer, { snapshot: { date: "2026-11-20", source: "frankfurter", sourceLabel: "ECB 기준 원화 환산", rates: model.buildKoreaEximRates(days) } }));
  for (const text of ["환율 우대", "ECB", "통화 검색", "환산 방향 바꾸기", "EUR", "IDR", "100단위"]) assert.ok(html.includes(text), text);
  assert.ok(!html.includes("NaN") && !html.includes("Infinity"));
});
test("homepage keeps only yen and dollars while preserving the detail link during an outage", async () => {
  for (const available of [true, false]) {
    const { ExchangeRateCard } = load("src/components/ExchangeRateCard.tsx", {
      "react/jsx-runtime": jsx, "lucide-react": icons,
      "next/link": { default: ({ children, ...props }) => { const attributes = { ...props }; delete attributes.prefetch; return React.createElement("a", attributes, children); } },
      "@/data/exchangeRates": { getExchangeRateSnapshot: async () => available ? { date: "2026-11-20", sourceLabel: "한국수출입은행 매매기준율", rates: model.buildKoreaEximRates(days) } : null },
    });
    const html = renderToStaticMarkup(await ExchangeRateCard());
    assert.ok(html.includes('href="/exchange-rates"'));
    if (available) assert.ok(html.includes("JPY") && html.includes("USD") && !html.includes("EUR") && !html.includes("IDR"));
  }
});
