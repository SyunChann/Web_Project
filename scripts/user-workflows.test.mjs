import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
function load(file, modules = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: (name) => { if (name in modules) return modules[name]; if (name === "crypto") return require(name); throw Error(`Unexpected dependency: ${name}`); }, URL, URLSearchParams, File, FormData, process: { env: {} } });
  return exports;
}
const returnTo = load("src/lib/returnTo.ts");
test("login return addresses preserve internal queries while rejecting external, encoded, control and loop destinations", () => {
  for (const path of ["/new?type=review", "/drinks/new", "/reviews/post/edit", "/reviews?q=hello%20world&sort=rating-desc"]) assert.equal(returnTo.safeReturnTo(path), path);
  for (const path of [undefined, ["/new"], "https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/%255cevil.test", "/%0d%0aLocation:evil", "/login?next=/new", "/%6cogin", "/new/../login", "/auth/callback", "/reset-password?token=private", "/bad%ZZ"]) assert.equal(returnTo.safeReturnTo(path), "/", String(path));
  assert.equal(new URL(returnTo.loginHref("/new?type=travel"), "https://local.test").searchParams.get("next"), "/new?type=travel");
});
function redirect(href) { throw Object.assign(new Error("redirect"), { href }); }
test("successful login resumes the requested page; login failures retain the safe return address", async () => {
  const data = new FormData(); data.set("email", "test@example.com"); data.set("password", "fixture-password"); data.set("next", "/new?type=travel");
  for (const failed of [false, true]) {
    const actions = load("src/app/login/actions.ts", {
      "next/navigation": { redirect }, "next/headers": { cookies: async () => ({ delete() {} }) }, "@/lib/returnTo": returnTo,
      "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { signInWithPassword: async () => ({ error: failed ? { status: 429 } : null }) } }) },
    });
    await assert.rejects(actions.signIn(data), (error) => {
      if (!failed) return error.href === "/new?type=travel";
      const url = new URL(error.href, "https://local.test"); return url.pathname === "/login" && url.searchParams.get("next") === "/new?type=travel" && url.searchParams.get("error") === "limited";
    });
  }
});
test("a content save returns a destination only after a confirmed database write; expired sessions preserve the draft route", async () => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ id: "workflow-test", title: "Workflow", type: "movie", rating: "4", watched_at: "2026-11-23", summary: "summary", review: "body", return_to: "/new?type=review" })) data.set(key, value);
  for (const state of ["success", "failure", "expired"]) {
    const writes = [];
    const actions = load("src/app/actions/reviews.ts", {
      "next/navigation": { redirect }, "next/cache": { updateTag() {}, revalidatePath() {} }, "@/lib/returnTo": returnTo,
      "@/lib/thumbnailReference": { readUploadedThumbnail: async () => null },
      "@/lib/contentPermissions": { canManageContent: () => false }, "@/lib/discord": { notifyDiscord: async () => {} },
      "@/lib/supabase/server": { createSupabaseServerClient: async () => ({
        auth: { getUser: async () => ({ data: { user: state === "expired" ? null : { id: "owner", email: "owner@example.com", user_metadata: {} } } }) },
        from: () => ({ insert: async (value) => { writes.push(value); return { error: state === "failure" ? { message: "write failed" } : null }; } }),
      }) },
    });
    if (state === "success") { const saved = await actions.createReview(data); assert.equal(saved.redirectTo, "/reviews/workflow-test"); assert.equal(writes[0].author_id, "owner"); }
    else await assert.rejects(actions.createReview(data), (error) => state === "failure" ? error.message === "write failed" : new URL(error.href, "https://local.test").searchParams.get("next") === "/new?type=review");
    assert.equal(writes.length, state === "expired" ? 0 : 1);
  }
});
