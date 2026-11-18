import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
async function render(params) {
  const calls = [], exports = {};
  const modules = {
    "react/jsx-runtime": jsx,
    "lucide-react": { CalendarDays: () => null },
    "@/components/AppNav": { AppNav: () => null },
    "@/components/ContentSectionTabs": { ContentSectionTabs: () => null },
    "@/components/watchlist/AniListQuarterCalendar": { AniListQuarterCalendar: props => React.createElement("section", { "data-year": props.year, "data-quarter": props.quarter }, props.items.map(item => item.title).join(" · ")) },
    "@/data/anilist": { getCurrentAniListQuarter: () => 4, getAniListQuarterReleases: async (year, quarter) => { calls.push([year, quarter]); return [{ title: "애니 신작 테스트" }]; } },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/app/release-calendar/page.tsx", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: name => { assert.ok(name in modules, `Unexpected dependency: ${name}`); return modules[name]; }, Date,
  });
  return { html: renderToStaticMarkup(await exports.default({ searchParams: Promise.resolve(params) })), calls };
}
test("release calendar reads only seasonal anime and omits registered watchlist schedules", async () => {
  const { html, calls } = await render({ year: "2027", quarter: "1" });
  assert.deepEqual(calls, [[2027, 1]]); assert.ok(html.includes("애니 신작 캘린더") && html.includes("애니 신작 테스트"));
  assert.ok(!html.includes("다가오는 공개작") && !html.includes("날짜 미정·예정작"));
});
test("fractional quarters fall back to the current season", async () => {
  const { calls } = await render({ year: "2027", quarter: "1.5" }); assert.deepEqual(calls, [[2027, 4]]);
});
