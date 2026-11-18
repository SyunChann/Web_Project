import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { Suspense } from "react";
import * as jsx from "react/jsx-runtime";
function setup() {
  const cache = new Map(), calls = [], invalidations = []; let rpcError = null, writeError = null, version = 0, options;
  const modules = {
    react: { cache: fn => fn },
    "next/cache": {
      unstable_cache: (fn, _keys, config) => { options = config; return async args => { const key = JSON.stringify(args); if (cache.has(key)) return cache.get(key); const result = await fn(args); cache.set(key, result); return result; }; },
      updateTag: tag => { invalidations.push(tag); cache.clear(); version++; }, revalidatePath() {},
    },
    "node:crypto": { randomUUID: () => "12345678-1234-4234-8234-123456789abc" },
    "@/lib/supabase/public": { createSupabasePublicClient: () => ({
      rpc: async (name, args) => { calls.push({ name, args }); return { data: rpcError ? null : { items: [{ id: "post", name: `v${version}`, excerpt: "preview", image: null }], total_count: 32 }, error: rpcError }; },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { body: "FULL_BODY", images: ["a", "b"] }, error: null }) }) }) }),
    }) },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
      from: () => { const query = { insert: () => query, delete: () => query, eq: () => query, select: () => query,
        single: async () => ({ data: writeError ? null : { id: "saved" }, error: writeError }),
        maybeSingle: async () => ({ data: writeError ? null : { id: "saved", images: [] }, error: writeError }) }; return query; },
      storage: { from: () => ({ remove: async () => ({}) }) },
    }) },
  };
  function load(path) { const exports = {}; vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => modules[name] ?? {}, Date, FormData }); return exports; }
  modules["@/lib/drinks"] = load("src/lib/drinks.ts");
  const data = load("src/data/drinks.ts"), actions = load("src/app/actions/drinks.ts");
  return { data, actions, calls, invalidations, model: modules["@/lib/drinks"], options: () => options, failRead: error => { rpcError = error; }, failWrite: error => { writeError = error; } };
}
function form() { const result = new FormData(); for (const [key, value] of Object.entries({ name: "위스키", body: "맛 기록", category: "whisky", kind: "curious" })) result.set(key, value); return result; }
test("public preview cache shares normalized filters and stores only bounded list responses", async () => {
  const h = setup();
  await h.data.getDrinkPosts({ q: " test ", page: "2.5" }); await h.data.getDrinkPosts({ q: "test", page: "2" });
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].name, "drink_list_page_v1"); assert.equal(h.calls[0].args.p_query, "test");
  assert.equal(h.options().revalidate, 60); assert.equal(h.options().tags.join(","), "drinks");
  await h.data.getDrinkPosts({ q: "other", page: "2" }); assert.equal(h.calls.length, 2);
});
test("failed public reads are not stored as successful cached lists", async () => {
  const h = setup(); h.failRead({ code: "PGRST202" }); assert.ok((await h.data.getDrinkPosts({})).error);
  h.failRead(null); assert.equal((await h.data.getDrinkPosts({})).count, 32); assert.equal(h.calls.length, 2);
});
test("successful writes and deletion expire list caches immediately while failed writes retain valid data", async () => {
  const h = setup(); await h.data.getDrinkPosts({});
  h.failWrite({}); assert.ok((await h.actions.saveDrinkPost(null, form())).error); await h.data.getDrinkPosts({}); assert.equal(h.calls.length, 1); assert.equal(h.invalidations.length, 0);
  h.failWrite(null); assert.equal((await h.actions.saveDrinkPost(null, form())).id, "12345678-1234-4234-8234-123456789abc");
  assert.equal((await h.data.getDrinkPosts({})).posts[0].name, "v1"); assert.equal(h.calls.length, 2);
  await h.actions.deleteDrinkPost("saved"); await h.data.getDrinkPosts({}); assert.equal(h.calls.length, 3); assert.equal(h.invalidations.join(","), "drinks,drinks");
});
test("detail reads keep the full body and all photos", async () => {
  const h = setup(); const { post } = await h.data.getDrinkPost("12345678-1234-4234-8234-123456789abc"); assert.equal(post.body, "FULL_BODY"); assert.equal(post.images.length, 2);
});
test("drink page returns its shell without awaiting data and keeps filter/result identities distinct across pagination", async () => {
  const exports = {}; let queried = false;
  const modules = { react: { Suspense }, "react/jsx-runtime": jsx, "@/components/drinks/Drinks.module.css": { default: new Proxy({}, { get: (_target, name) => name }) }, "@/lib/drinks": setup().model, "@/data/drinks": { getDrinkPosts: () => { queried = true; throw Error("shell must not wait"); } } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/app/drinks/page.tsx", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => modules[name] ?? {} });
  const identities = [];
  for (const page of ["1", "2"]) {
    const tree = await exports.default({ searchParams: Promise.resolve({ page }) });
    const children = tree.props.children.props.children;
    const keyed = children.filter(child => child?.key != null).map(child => child.key);
    assert.equal(new Set(keyed).size, keyed.length);
    assert.ok(children.some(child => child?.type === "form"));
    assert.ok(children.some(child => child?.type === Suspense));
    identities.push(keyed.join("|"));
  }
  assert.equal(queried, false); assert.notEqual(identities[0], identities[1]);
});
