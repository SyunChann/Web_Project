import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/drinks.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { readDrinkPayload: parse } = exports;
test("drink author names prefer nonblank account names and then the email prefix", () => {
  const author = { id: "12345678-1234", email: "tester@example.com", user_metadata: { display_name: " ", name: "테스터" } };
  assert.equal(exports.drinkAuthorName(author), "테스터");
  assert.equal(exports.drinkAuthorName({ ...author, user_metadata: {} }), "tester");
  assert.equal(exports.drinkAuthorName({ id: author.id }), "사용자 12345678");
});
const owner = "12345678-1234-4234-8234-123456789abc";
const path = `${owner}/abcdefab-1234-4234-8234-abcdefabcdef.jpg`;
function data(values = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ name: "테스트 위스키", category: "whisky", kind: "review", rating: "4.5", body: "과일향이 좋았어요.", ...values })) {
    for (const item of Array.isArray(value) ? value : [value]) form.append(key, item);
  }
  return form;
}
test("all ten half-star ratings are accepted", () => {
  for (let value = .5; value <= 5; value += .5) assert.equal(parse(data({ rating: String(value) }), owner).rating, value);
});
test("missing, out-of-range, fractional and non-finite ratings are rejected", () => {
  for (const value of ["", "0", "5.5", "-1", "3.2", "NaN", "Infinity"]) assert.throws(() => parse(data({ rating: value }), owner));
  const form = data(); form.delete("rating"); assert.throws(() => parse(form, owner));
});
test("curious posts have no rating or drinking methods", () => {
  const result = parse(data({ kind: "curious", rating: "4.5", methods: ["하이볼"] }), owner);
  assert.equal(result.rating, null); assert.equal(result.methods.length, 0);
});
test("curious posts cannot claim tasting tags", () => assert.throws(() => parse(data({ kind: "curious", tags: ["스모키"] }), owner)));
test("valid methods and taste tags are retained and deduplicated", () => {
  const result = parse(data({ methods: ["온더록", "하이볼", "온더록"], tags: ["과일향", "스모키"] }), owner);
  assert.equal(result.methods.join(","), "온더록,하이볼"); assert.equal(result.tags.join(","), "과일향,스모키");
});
test("unknown categories, kinds, methods and tags are rejected", () => {
  for (const value of [{ category: "__proto__" }, { kind: "other" }, { methods: ["invalid"] }, { tags: ["invalid"] }]) assert.throws(() => parse(data(value), owner));
});
test("blank and oversized name or body are rejected", () => {
  for (const value of [{ name: " " }, { body: " " }, { name: "x".repeat(101) }, { body: "x".repeat(10001) }]) assert.throws(() => parse(data(value), owner));
});
test("only owned photo paths are accepted", () => {
  assert.equal(parse(data({ images: [path] }), owner).images[0], path);
  for (const value of ["https://example.com/image.jpg", `other/${path}`, `${owner}/../x.jpg`, `${owner}/x.svg`]) assert.throws(() => parse(data({ images: [value] }), owner));
});
test("photo count and duplicate paths are bounded", () => {
  assert.throws(() => parse(data({ images: [path, path] }), owner));
  assert.throws(() => parse(data({ images: Array.from({ length: 6 }, (_, i) => `${owner}/abcdefab-1234-4234-8234-abcdefabcde${i}.jpg`) }), owner));
});
