import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/listNavigation.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, URL, window: { dispatchEvent() {} }, Event, sessionStorage: { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } } });
const { listScope, detailLocation, parseListVisit, readListVisit, writeListVisit } = exports;
const now = 1794891600000;
const visit = { scope: "drinks", listHref: "/drinks?category=sake&rating=4&page=2", detailPath: "/drinks/a", anchorPath: "/drinks/a", scrollY: 2400, anchorTop: 150, anchorIndex: 0, savedAt: now, pendingRestore: true };
test("all six content lists and the travel overview are recognized", () => {
  for (const [path, scope] of [["/reviews", "reviews"], ["/watchlist/items", "watchlist"], ["/merchandise", "merchandise"], ["/restaurants/items", "restaurants"], ["/travel/items", "travel"], ["/travel", "travel"], ["/drinks", "drinks"]]) assert.equal(listScope(path), scope);
  for (const path of ["/", "/login", "/admin", "/departures", "/restaurants/map"]) assert.equal(listScope(path), null);
});
test("detail navigation recognizes edit/map paths and excludes new/list pages", () => {
  for (const path of ["/reviews/a", "/reviews/a/edit", "/reviews/a/map"]) assert.equal(detailLocation(path).path, "/reviews/a");
  for (const path of ["/drinks/new", "/travel/items", "/restaurants/map", "/reviews/a/unknown", "//drinks/a"]) assert.equal(detailLocation(path), null);
});
test("a return retains the complete filter/page URL and the original anchor", () => {
  const result = parseListVisit({ ...visit, detailPath: "/drinks/b" }, now);
  assert.equal(result.listHref, visit.listHref); assert.equal(result.anchorPath, "/drinks/a"); assert.equal(result.detailPath, "/drinks/b"); assert.equal(result.scrollY, 2400);
});
test("external, malformed and cross-category return destinations are rejected", () => {
  for (const listHref of ["https://evil.example/drinks", "//evil.example/drinks", "/\\evil.example/drinks", "/login", "/reviews", "/drinks/../admin", "javascript:alert(1)"]) assert.equal(parseListVisit({ ...visit, listHref }, now), null);
  for (const detailPath of ["/reviews/a", "/drinks/new", "/drinks/a/edit", "/drinks/a?x=1"]) assert.equal(parseListVisit({ ...visit, detailPath }, now), null);
  assert.equal(parseListVisit({ ...visit, anchorPath: "/travel/a" }, now), null);
});
test("corrupt, stale and unreasonable positions are discarded", () => {
  for (const value of [null, "invalid", {}, { ...visit, savedAt: now - 86400_001 }, { ...visit, savedAt: now + 60_001 }, { ...visit, scrollY: NaN }, { ...visit, scrollY: -1 }, { ...visit, scrollY: Infinity }, { ...visit, anchorTop: Infinity }, { ...visit, anchorIndex: -1 }]) assert.equal(parseListVisit(value, now), null);
});
test("unavailable browser storage falls back to tab memory without throwing", () => {
  writeListVisit({ ...visit, savedAt: Date.now() });
  assert.equal(readListVisit("drinks").listHref, visit.listHref);
  assert.equal(readListVisit("reviews"), null);
});
