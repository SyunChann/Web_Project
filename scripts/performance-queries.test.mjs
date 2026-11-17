import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(path, require) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require });
  return exports;
}
test("home summary projects only latest title/date, bounds every source and retains cache tags", async () => {
  const calls = []; let cacheOptions;
  const client = { from(table) {
    const record = { table }; calls.push(record);
    const query = { select(fields) { record.fields = fields; return query; }, eq(...scope) { record.scope = scope; return query; }, or(scope) { record.scope = scope; return query; }, order() { return query; }, limit(limit) { record.limit = limit; return query; }, async overrideTypes() { return { data: [{ title: "기록", trip_title: table === "travel" ? "여행 묶음" : undefined, created_at: "2026-11-01" }], error: null }; } };
    return query;
  } };
  const { getHomeSummary } = load("../src/data/homeSummary.ts", (name) => name === "next/cache" ? { unstable_cache: (fn, keys, options) => { cacheOptions = options; return fn; } } : { createSupabasePublicClient: () => client });
  const result = await getHomeSummary();
  assert.equal(calls.length, 6);
  for (const call of calls) { assert.equal(call.limit, 1); assert.ok(!call.fields.includes("review")); assert.ok(!call.fields.includes("*")); }
  assert.equal(result.travel.title, "여행 묶음"); assert.equal(cacheOptions.tags.length, 5);
  assert.equal(calls.filter(call => call.table === "restaurant_reviews").length, 2);
});
test("content pages send bounded page, literal search and filters to one read-only RPC", async () => {
  let request;
  const { fetchContentPage, normalizePage } = load("../src/data/contentPage.ts", () => ({ createSupabasePublicClient: () => ({ rpc: async (name, args) => { request = { name, args }; return { data: { items: [{ id: "a" }], total_count: 40, page: 2 }, error: null }; } }) }));
  const result = await fetchContentPage("travel", { query: "  100%_  ", scope: "overseas", sort: "rating-desc", page: 2.8 });
  assert.equal(request.name, "archive_list_page_v1"); assert.equal(request.args.p_page, 2); assert.equal(request.args.p_query, "100%_"); assert.equal(request.args.p_sort, "rating-desc"); assert.equal(result.count, 40); assert.equal(result.page, 2);
  for (const value of [undefined, NaN, Infinity, -5, 0]) assert.equal(normalizePage(value), 1);
  assert.equal(normalizePage(999999), 10000);
});
test("missing configuration and RPC errors produce an explicit list status", async () => {
  for (const client of [null, { rpc: async () => ({ data: null, error: { code: "PGRST202" } }) }, { rpc: async () => { throw Error("offline"); } }]) {
    const { fetchContentPage } = load("../src/data/contentPage.ts", () => ({ createSupabasePublicClient: () => client }));
    const result = await fetchContentPage("watchlist", {}); assert.equal(result.rows.length, 0); assert.ok(result.error); assert.equal(result.page, 1);
  }
});
