import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import * as icons from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

function load(file, modules = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: (key) => {
    if (key === "server-only") return {};
    if (!(key in modules)) throw Error(`Unexpected module ${key}`);
    return modules[key];
  }, URL, AbortSignal, Date, process: { env: {} }, console: { error() {} }, ...globals });
  return exports;
}
const tree = [{ categoryId: 20, displayName: "식품", children: [{ categoryId: 21, displayName: "패션후르츠" }] },
  { categoryId: 700, displayName: "패션", children: [{ categoryId: 701, displayName: "여성의류" }, { categoryId: 702, displayName: "남성의류" }] }];
const product = (id) => ({ tacaItemId: id, displayName: id < 1000 ? "패션 의류" : "식품 상품", displayPrice: 20000, isSoldOut: false, thumbnailUrl: `https://images.example.com/${id}.png?original=1` });
function harness(options = {}) {
  let now = 1_800_000_000_000;
  const flags = { ...options }, calls = [], observations = [];
  class Clock extends Date { static now() { return now; } }
  const model = load("src/lib/apiMonitoringModel.ts");
  const api = load("src/lib/tossSharelink.ts", {
    "@/lib/apiMonitoringModel": model,
    "@/lib/apiMonitoring": { observeApi: async (_, operation) => {
      try { return await operation(); } catch (error) { observations.push(model.failureObservation(error)); throw error; }
    } },
  }, { Date: Clock, process: { env: options.unconfigured ? {} : { TOSS_PROXY_BASE_URL: "https://proxy.invalid", TOSS_PROXY_API_KEY: "private-fixture-key" } }, fetch: async (raw, init) => {
    const url = new URL(raw); calls.push(url.pathname);
    if (flags.outage) throw Error("fixture outage");
    let success;
    if (url.pathname === "/v1/categories") {
      if (flags.nonJsonError) return { ok: false, status: flags.nonJsonError, json: async () => { throw SyntaxError("private-response-marker"); } };
      if (flags.invalidJson) return { ok: true, status: 200, json: async () => { throw SyntaxError("private-response-marker"); } };
      if (flags.categoriesUnsupported) return { ok: false, status: 404, json: async () => ({ resultType: "FAIL" }) };
      success = { categories: flags.noFashion ? tree.slice(0, 1) : flags.tree ?? tree };
    } else if (url.pathname.includes("best-categories")) {
      const id = Number(url.pathname.split("/").at(-1));
      success = { category: { categoryId: flags.wrongCategory ? 20 : id }, items: flags.empty ? [] : [product(id)] };
    } else if (url.pathname.includes("best-selling")) success = { items: [product(9000)] };
    else if (url.pathname.includes("detail")) success = { items: url.searchParams.get("tacaItemIds").split(",").map((id) => product(Number(id))) };
    else if (url.pathname === "/v1/links") success = { shortUrl: flags.unsafeLink ? "javascript:alert(1)" : `https://toss.im/p/${JSON.parse(init.body).tacaItemId}` };
    else throw Error(`Unexpected path ${url.pathname}`);
    return { ok: true, json: async () => ({ resultType: "SUCCESS", success }) };
  } });
  return { api, calls, flags, observations, advance: (ms) => { now += ms; } };
}

test("HTML error responses retain their HTTP status without parsing or exposing proxy response bodies", async () => {
  for (const status of [404, 401, 403, 429, 503]) {
    const { api, observations } = harness({ nonJsonError: status });
    const result = await api.getTossFashionContent();
    assert.equal(result.status, "error");
    assert.equal(observations[0].httpStatus, status);
    assert.equal(observations[0].state, status === 401 || status === 403 ? "authentication" : status === 429 ? "rate-limit" : "upstream-error");
    assert.ok(!JSON.stringify({ result, observations }).includes("private-response-marker"));
  }
});
test("malformed JSON in a successful response is recorded as HTTP 200 invalid-response", async () => {
  const { api, observations } = harness({ invalidJson: true });
  assert.equal((await api.getTossFashionContent()).status, "error");
  assert.equal(observations[0].httpStatus, 200);
  assert.equal(observations[0].state, "invalid-response");
});

test("fashion discovery uses category trees, rejects food lookalikes and does not hardcode example category IDs", () => {
  const { api } = harness();
  assert.deepEqual(Array.from(api.getFashionCategories(tree), (x) => x.categoryId), [700, 701, 702]);
});
const scopedTree = [
  { categoryId: 100, displayName: "생활", children: [
    { categoryId: 101, displayName: "가방" },
    { categoryId: 102, displayName: "시계", children: [{ categoryId: 103, displayName: "벽시계" }] },
  ] },
  { categoryId: 200, displayName: "반려동물", children: [{ categoryId: 201, displayName: "패션" }] },
  { categoryId: 300, displayName: "여성패션", children: [{ categoryId: 301, displayName: "가방" }] },
  { categoryId: 400, displayName: "남성패션", children: [{ categoryId: 401, displayName: "가방" }, { categoryId: 402, displayName: "남성시계" }] },
  { categoryId: 500, displayName: "패션", children: [{ categoryId: 501, displayName: "의류" }] },
];
test("fashion scope excludes unrelated bags, household clocks and pet fashion; roots and duplicate labels stay ordered", () => {
  const { api } = harness();
  const categories = api.getFashionCategories(scopedTree);
  assert.deepEqual(Array.from(categories, (category) => category.categoryId), [500, 501, 400, 401, 402, 300, 301]);
  assert.equal(categories.find((category) => category.categoryId === 401).label, "남성패션 > 가방");
  assert.equal(categories.find((category) => category.categoryId === 301).label, "여성패션 > 가방");
  assert.equal(api.getFashionCategories(scopedTree.slice(0, -1))[0].displayName, "남성패션");
});
test("the main fashion root is the default regardless of taxonomy order and invalid legacy selections", async () => {
  const { api, calls } = harness({ tree: scopedTree });
  for (const requested of [undefined, "101", "102", "201"]) {
    assert.equal((await api.getTossFashionContent(requested)).selectedCategory.categoryId, 500);
  }
  assert.ok(calls.filter((path) => path.includes("best-categories")).every((path) => path.endsWith("/500")));
});
test("fashion uses a category ranking endpoint and tracked links; existing best-selling stays separate", async () => {
  const { api, calls } = harness();
  const all = await api.getTossSharelinkContent();
  const fashion = await api.getTossFashionContent();
  assert.equal(all.products[0].tacaItemId, 9000); assert.equal(fashion.products[0].tacaItemId, 700);
  assert.equal(fashion.selectedCategory.categoryId, 700);
  assert.ok(calls.includes("/v1/products/best-categories/700"));
  assert.equal(fashion.products[0].shareUrl, "https://toss.im/p/700");
  assert.ok(!JSON.stringify(fashion).includes("private-fixture-key"));
});
test("category switches use isolated caches; repeated and concurrent requests share upstream loads", async () => {
  const { api, calls } = harness();
  await Promise.all([api.getTossFashionContent("701"), api.getTossFashionContent("701")]);
  const next = await api.getTossFashionContent("702");
  assert.equal(next.products[0].tacaItemId, 702);
  await api.getTossFashionContent("701");
  assert.equal(calls.filter((path) => path === "/v1/categories").length, 1);
  assert.equal(calls.filter((path) => path === "/v1/products/best-categories/701").length, 1);
});
test("fashion rankings reuse the daily cache while the general ranking keeps its hourly refresh", async () => {
  const { api, calls, advance } = harness();
  await api.getTossFashionContent(); await api.getTossSharelinkContent();
  advance(2 * 60 * 60 * 1000);
  await api.getTossFashionContent(); await api.getTossSharelinkContent();
  assert.equal(calls.filter((path) => path.includes("best-categories")).length, 1);
  assert.equal(calls.filter((path) => path.includes("best-selling")).length, 2);
  advance(24 * 60 * 60 * 1000);
  await api.getTossFashionContent();
  assert.equal(calls.filter((path) => path.includes("best-categories")).length, 2);
});
test("arbitrary, malformed and non-fashion category query values never reach an upstream category path", async () => {
  const { api, calls } = harness();
  for (const value of ["20", "../../links", "-1", "1e3", "99999999999999999999"]) {
    const result = await api.getTossFashionContent(value);
    assert.equal(result.selectedCategory.categoryId, 700);
  }
  assert.ok(calls.filter((path) => path.includes("best-categories")).every((path) => path.endsWith("/700")));
});
test("empty category rankings stay empty and never fall back to non-fashion best-selling", async () => {
  const { api, calls } = harness({ empty: true });
  const result = await api.getTossFashionContent();
  assert.equal(result.status, "ready"); assert.equal(result.products.length, 0);
  assert.ok(!calls.some((path) => path.includes("best-selling") || path.includes("/links")));
});
test("missing fashion categories, unsupported proxy routes and wrong category responses are distinct safe states", async () => {
  for (const options of [{ noFashion: true }, { categoriesUnsupported: true }, { wrongCategory: true }]) {
    const { api, calls } = harness(options);
    const result = await api.getTossFashionContent();
    assert.equal(result.status, options.noFashion ? "ready" : "error");
    assert.ok(!calls.some((path) => path.includes("best-selling")));
  }
});
test("fashion outage fallback expires at 24 hours and does not reuse the general best-selling cache", async () => {
  const { api, flags, advance } = harness();
  await api.getTossSharelinkContent(); await api.getTossFashionContent(); flags.outage = true;
  advance(23 * 60 * 60 * 1000);
  const stale = await api.getTossFashionContent();
  assert.equal(stale.products[0].tacaItemId, 700);
  advance(60 * 60 * 1000);
  assert.equal((await api.getTossFashionContent()).status, "error");
});
test("unconfigured mode never calls upstream and unsafe tracking links are never displayed", async () => {
  const absent = harness({ unconfigured: true });
  assert.equal((await absent.api.getTossFashionContent()).status, "not-configured"); assert.equal(absent.calls.length, 0);
  const unsafe = harness({ unsafeLink: true });
  assert.equal((await unsafe.api.getTossFashionContent()).products.length, 0);
});
test("fashion screen keeps ad disclosure, original image blocking, sponsored links and navigation", () => {
  const images = load("src/lib/tossProductImages.ts");
  const { TossShoppingPage } = load("src/components/TossShoppingPage.tsx", {
    "react/jsx-runtime": jsx, "lucide-react": icons,
    "next/link": { default: ({ children, ...props }) => { delete props.prefetch; return React.createElement("a", props, children); } },
    "@/components/AppNav": { AppNav: () => null }, "@/components/ContentSectionTabs": { ContentSectionTabs: () => null },
    "@/components/TossProductImage": { TossProductImage: ({ src }) => React.createElement("img", { src, alt: "original" }) },
    "@/lib/tossProductImages": images,
    "@/app/recommendations/Recommendations.module.css": { default: new Proxy({}, { get: (_, key) => String(key) }) },
  }, { process: { env: { TOSS_IMAGE_BLOCKED_IDS: "700" } } });
  const html = renderToStaticMarkup(React.createElement(TossShoppingPage, { fashion: true, result: { status: "ready", products: [{ ...product(700), rank: 1, shareUrl: "https://toss.im/p/700" }] } }));
  for (const text of ["패션 인기 상품", "광고", "수수료", "/recommendations/fashion", "sponsored noreferrer", "https://toss.im/p/700"]) assert.ok(html.includes(text), text);
  assert.ok(!html.includes("https://images.example.com/700.png"));
  const empty = renderToStaticMarkup(React.createElement(TossShoppingPage, { fashion: true, result: { status: "ready", products: [] } }));
  assert.ok(empty.includes("현재 이 분류에서 제공되는 인기 상품이 없습니다"));
  assert.ok(empty.includes("다음 순위 갱신"));
  assert.ok(!empty.includes("불러오지 못했습니다"));
});
