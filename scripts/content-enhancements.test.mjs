import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, require = () => ({})) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require, URL });
  return exports;
}
const drinks = load("../src/lib/drinks.ts");
test("drink filters normalize half-star minimums, allowed tags and bounded pages", () => {
  const filters = drinks.readDrinkFilters({ rating: "4.5", tag: "바닐라", category: "whisky", kind: "review", q: "  발베니  ", page: "2.9" });
  assert.equal(filters.rating, "4.5"); assert.equal(filters.tag, "바닐라"); assert.equal(filters.page, 2); assert.equal(filters.q, "발베니");
  for (const rating of ["0", "5.5", "4.3", "NaN", "Infinity"]) assert.equal(drinks.readDrinkFilters({ rating }).rating, "");
  const invalid = drinks.readDrinkFilters({ category: "__proto__", kind: "constructor", tag: "unknown", page: "Infinity" });
  assert.equal(invalid.category, ""); assert.equal(invalid.kind, ""); assert.equal(invalid.tag, ""); assert.equal(invalid.page, 10000);
});
test("drink data query combines filters before pagination and retains exact total", async () => {
  const calls = [];
  const query = {};
  for (const method of ["select", "order", "eq", "gte", "contains", "ilike"]) query[method] = (...args) => { calls.push([method, ...args]); return query; };
  query.range = async (...args) => { calls.push(["range", ...args]); return { data: [], count: 35, error: null }; };
  const data = load("../src/data/drinks.ts", (name) => name === "react" ? { cache: (fn) => fn } : name.endsWith("/public") ? { createSupabasePublicClient: () => ({ from: () => query }) } : name === "@/lib/drinks" ? drinks : {});
  const result = await data.getDrinkPosts({ rating: "4", tag: "스모키", category: "whisky", q: "100%_", page: "2" });
  assert.equal(result.count, 35);
  assert.ok(calls.some(([fn, field, value]) => fn === "gte" && field === "rating" && value === 4));
  assert.ok(calls.some(([fn, field, values]) => fn === "contains" && field === "tags" && values[0] === "스모키"));
  assert.ok(calls.some(([fn, field, value]) => fn === "ilike" && field === "name" && value === "%100\\%\\_%"));
  assert.equal(calls.at(-1).join(","), "range,24,47");
});
const { postMetadata, defaultShareImage } = load("../src/lib/postMetadata.ts", () => ({ getSiteUrl: () => "https://syun-archive.vercel.app" }));
test("post sharing uses each post title, summary, canonical link and original photo", () => {
  const result = postMetadata({ title: "한 잔", description: "<p>바닐라 향</p>\n 부드러운 여운", path: "/drinks/example", image: "https://example.com/photo.jpg", imageAlt: "술 사진" });
  assert.equal(result.title, "한 잔 | 취향 보관소"); assert.equal(result.description, "바닐라 향 부드러운 여운");
  assert.equal(result.openGraph.type, "article"); assert.equal(result.openGraph.url, "/drinks/example");
  assert.equal(result.openGraph.images[0].url, "https://example.com/photo.jpg");
  assert.equal(result.twitter.images[0].alt, "술 사진");
});
test("missing photos, unsupported SVGs and unsafe protocols use the branded share image", () => {
  for (const image of [undefined, "/fallback.svg", "/fallback.SVG", "javascript:alert(1)", "data:image/png;base64,invalid"]) {
    assert.equal(postMetadata({ title: "기록", path: "/reviews/example", image }).openGraph.images[0].url, defaultShareImage);
  }
  assert.equal(postMetadata({ title: "기록", path: "/reviews/example", image: "/photo.png" }).openGraph.images[0].url, "https://syun-archive.vercel.app/photo.png");
  assert.equal(postMetadata({ title: "기록", path: "/reviews/example", description: "<p> </p>" }).description, "좋아하는 것을 기록하는 공간.");
});
