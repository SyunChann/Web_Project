import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { renderAdminFixture } from "./helpers/admin-fixture.mjs";
function load(file, modules = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: (name) => modules[name] ?? {} });
  return exports;
}
const model = load("src/lib/adminContent.ts");
const { getAdminContent } = load("src/data/admin.ts", { "@/lib/adminContent": model });
const row = { id: "test", name: "위스키", title: "기록", created_at: "2026-11-16T00:00:00Z", author_id: "owner", images: [] };
test("catalog includes drinks and separates domestic and overseas restaurants", () => {
  assert.equal(Object.keys(model.adminContentMeta).length, 7);
  assert.equal(model.adminContentMeta.drink.listHref, "/drinks");
  assert.equal(model.adminContentMeta.watchlist.listHref, "/watchlist/items");
  assert.notEqual(model.adminContentMeta.domestic.listHref, model.adminContentMeta.overseas.listHref);
});
test("drink management respects ownership rather than offering broken edit links", () => {
  assert.equal(model.normalizeAdminContent("drink", [row], "owner")[0].canEdit, true);
  assert.equal(model.normalizeAdminContent("drink", [row], "other")[0].canEdit, false);
});
test("optional drink photos and absent summary do not create false health warnings", () => {
  const item = model.normalizeAdminContent("drink", [row], "owner")[0];
  assert.equal(model.adminContentIssues(item).length, 0);
});
test("zero coordinates are valid while missing or non-finite coordinates are flagged", () => {
  for (const [latitude, longitude, expected] of [[0, 0, false], [null, 127, true], [37, null, true], [NaN, 127, true]]) {
    const item = model.normalizeAdminContent("domestic", [{ ...row, latitude, longitude }], "owner")[0];
    assert.equal(model.adminContentIssues(item).some(issue => issue.icon === "location"), expected);
  }
});
function client(fail = "") {
  const calls = [];
  return { calls, from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const query = {
      select(fields, options) { call.fields = fields; call.options = options; return query; },
      or(value) { call.filters.push(value); return query; },
      eq(key, value) { call.filters.push(`${key}=${value}`); return query; },
      order() { return query; },
      async limit(value) {
        call.limit = value;
        if (table === fail) throw new Error("network failure");
        return { data: [row], count: table === "drink_posts" ? 0 : 2400, error: null };
      },
    }; return query;
  } };
}
test("counts use exact totals and recent row loading stays bounded", async () => {
  const fake = client(); const results = await getAdminContent(fake, "owner");
  assert.equal(results.find(result => result.kind === "review").count, 2400);
  assert.equal(results.find(result => result.kind === "drink").count, 0);
  assert.ok(fake.calls.every(call => call.limit === 8 && call.options.count === "exact"));
  assert.ok(fake.calls.some(call => call.filters.includes("scope.eq.domestic,scope.is.null")));
  assert.ok(fake.calls.some(call => call.filters.includes("scope=overseas")));
});
test("one failed table remains unknown without hiding other categories", async () => {
  const results = await getAdminContent(client("watchlist_items"), "owner");
  const failed = results.find(result => result.kind === "watchlist");
  assert.equal(failed.count, null); assert.equal(failed.error, true);
  assert.equal(results.find(result => result.kind === "review").count, 2400);
});
test("admin route rejects anonymous visitors and non-admin members", async () => {
  await assert.rejects(() => renderAdminFixture("anonymous"), /REDIRECT:\/login/);
  await assert.rejects(() => renderAdminFixture("member"), /REDIRECT:\/$/);
});
test("admin overview renders newer services, exact counts and owner-aware actions without keys", async () => {
  const { html } = await renderAdminFixture();
  assert.ok(html.includes("관리자 홈") && html.includes("2400") && html.includes("인천공항 출국 안내"));
  assert.ok(html.includes("관리자 위스키 수정") && html.includes("다른 회원의 사케 보기"));
  assert.ok(!html.includes("다른 회원의 사케 수정") && !html.includes("fixture-secret-marker"));
});
test("invite and content errors remain local to their sections", async () => {
  const invite = await renderAdminFixture("invite-error");
  assert.ok(invite.html.includes("초대 조회 실패") && invite.html.includes("콘텐츠 관리"));
  const content = await renderAdminFixture("content-error");
  assert.ok(content.html.includes("기대작 정보를 불러오지 못했습니다") && content.html.includes("초대 코드 생성"));
});
