import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const { fashionCategories, diagnose } = createRequire(import.meta.url)("./check-toss-fashion.cjs");
const tree = [{ categoryId: 1, displayName: "식품" }, { categoryId: 10, displayName: "패션", children: [
  { categoryId: 11, displayName: "여성의류" }, { categoryId: 12, displayName: "남성의류" },
  { categoryId: 13, displayName: "신발" }, { categoryId: 14, displayName: "가방" },
] }];
const config = { origin: "http://127.0.0.1:1234", key: "test-secret-never-print" };
function harness(responses) {
  const calls = [], lines = [];
  return {
    calls, lines,
    options: {
      log: (...args) => lines.push(args.join(" ")),
      fetcher: async (raw, options) => {
        const url = new URL(raw);
        calls.push(url);
        assert.equal(options.method, "GET");
        assert.equal(options.redirect, "error");
        assert.equal(options.headers["x-proxy-api-key"], config.key);
        if (url.pathname === "/v1/categories") return new Response(JSON.stringify({ resultType: "SUCCESS", success: { categories: tree } }));
        assert.equal(url.searchParams.get("size"), "50");
        const id = Number(url.pathname.split("/").at(-1));
        const response = responses[id];
        if (response instanceof Error) throw response;
        return new Response(JSON.stringify(response.body ?? { resultType: "SUCCESS", success: { category: { categoryId: id }, items: response.items } }), { status: response.status ?? 200, headers: { "x-proxy-cache": "HIT" } });
      },
    },
  };
}

test("diagnosis uses exactly the same category selection as the website", () => {
  const source = ts.transpileModule(fs.readFileSync("src/lib/tossSharelink.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: () => ({}), Map, Set });
  const malformedTree = [...tree, { categoryId: -1, displayName: "패션" }, { categoryId: 10, displayName: "패션" },
    { categoryId: 20, displayName: "반려동물", children: [{ categoryId: 21, displayName: "패션" }] },
    { categoryId: 30, displayName: "시계", children: [{ categoryId: 31, displayName: "벽시계" }] },
    { categoryId: 40, displayName: "남성패션", children: [{ categoryId: 41, displayName: "가방" }] }];
  assert.equal(JSON.stringify(fashionCategories(malformedTree)), JSON.stringify(exports.getFashionCategories(malformedTree)));
});

test("diagnosis distinguishes empty, available, sold out, API errors, and malformed responses without leaking secrets", async () => {
  const h = harness({
    10: { items: [] }, 11: { items: [{ isSoldOut: false }] }, 12: { items: [{ isSoldOut: true }] },
    13: { body: { resultType: "FAIL", error: { errorCode: "PARTNER_NOT_AUTHORIZED", reason: config.key } } },
    14: { body: { resultType: "SUCCESS", success: { category: { categoryId: 999 }, items: [] } } },
  });
  assert.equal(await diagnose(config, h.options), false);
  const output = h.lines.join("\n");
  for (const state of ["EMPTY", "HAS_PRODUCTS", "SOLD_OUT", "ERROR", "INVALID_RESPONSE", "PARTNER_NOT_AUTHORIZED", "HIT"]) assert.ok(output.includes(state));
  assert.ok(!output.includes(config.key));
  assert.equal(h.calls.length, 6);
});

test("request failures are sanitized and a rate limit stops further requests", async () => {
  const h = harness({ 10: new Error(config.key), 11: { status: 429, body: { resultType: "FAIL", error: { errorCode: "RATE_LIMIT" } } } });
  assert.equal(await diagnose(config, h.options), false);
  assert.equal(h.calls.length, 3);
  assert.ok(h.lines.join("\n").includes("REQUEST_FAILED"));
  assert.ok(!h.lines.join("\n").includes(config.key));
});
