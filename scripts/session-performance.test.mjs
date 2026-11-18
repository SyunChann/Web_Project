import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(path, modules) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: name => modules[name] ?? {}, Date });
  return exports;
}
test("server user lookups share one in-flight result within a render and isolate subsequent requests", async () => {
  let requestCache = new Map(), identity = "member-a", reads = 0, clients = 0;
  const source = { createSupabaseServerClient: async () => {
    clients++; const id = identity;
    return { auth: { getUser: async () => { reads++; await Promise.resolve(); return { data: { user: { id } }, error: null }; } } };
  } };
  const { getSupabaseServerSession } = load("src/lib/supabase/session.ts", {
    react: { cache: fn => () => { if (!requestCache.has(fn)) requestCache.set(fn, fn()); return requestCache.get(fn); } }, "./server": source,
  });
  const [page, menu] = await Promise.all([getSupabaseServerSession(), getSupabaseServerSession()]);
  assert.equal(page.user.id, "member-a"); assert.equal(menu, page); assert.equal(reads, 1);
  requestCache = new Map(); identity = "member-b";
  assert.equal((await getSupabaseServerSession()).user.id, "member-b"); assert.equal(reads, 2); assert.equal(clients, 2);
});
test("a rejected identity is never replaced by the user object from cookies", async () => {
  const { getSupabaseServerSession } = load("src/lib/supabase/session.ts", {
    react: { cache: fn => fn }, "./server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "forged-admin" } }, error: {} }) } }) },
  });
  assert.equal((await getSupabaseServerSession()).user, null);
});
function proxyHarness({ authenticated = true, refresh = false, failure = false } = {}) {
  const requestCookies = new Map(authenticated ? [["sb-project-auth-token", "private-session"]] : []);
  let created = 0, refreshed = 0;
  const responses = [];
  const NextResponse = { next: () => { const res = { headers: new Map(), cookies: { set(...args) { (res.writes ??= []).push(args); }, delete(name) { (res.deletes ??= []).push(name); } } }; responses.push(res); return res; } };
  const { updateSession } = load("src/lib/supabase/proxy.ts", {
    "next/server": { NextResponse }, "./config": { supabaseUrl: "https://fixture.supabase.co", supabaseKey: "public" },
    "@supabase/ssr": { createServerClient: (_url, _key, { cookies }) => { created++; return { auth: {
      getUser: () => { throw Error("proxy must not authorize"); },
      getSession: async () => { refreshed++; if (refresh) cookies.setAll([{ name: "sb-project-auth-token", value: "refreshed", options: { path: "/" } }], { "Cache-Control": "private, no-store", Expires: "0" }); return { data: { session: { user: { is_admin: true } } }, error: failure ? {} : null }; },
    } }; } },
  });
  const request = { cookies: { getAll: () => [...requestCookies].map(([name, value]) => ({ name, value })), set: (name, value) => requestCookies.set(name, value), delete: name => requestCookies.delete(name), has: name => requestCookies.has(name) } };
  return { updateSession: () => updateSession(request), requestCookies, stats: () => ({ created, refreshed }) };
}
test("anonymous requests skip session machinery; proxy never uses cookie identity for access", async () => {
  const anonymous = proxyHarness({ authenticated: false }); await anonymous.updateSession(); assert.equal(anonymous.stats().created, 0);
  const loggedIn = proxyHarness(); await loggedIn.updateSession(); assert.equal(loggedIn.stats().refreshed, 1);
});
test("session refresh persists cookies and private response headers; failed refresh clears invalid cookies", async () => {
  const refreshed = proxyHarness({ refresh: true }); const response = await refreshed.updateSession();
  assert.equal(refreshed.requestCookies.get("sb-project-auth-token"), "refreshed"); assert.equal(response.headers.get("Cache-Control"), "private, no-store"); assert.equal(response.headers.get("Expires"), "0");
  const failed = proxyHarness({ failure: true }); failed.requestCookies.set("sb-project-auth-token-code-verifier", "pkce-verifier"); const cleared = await failed.updateSession();
  assert.equal(failed.requestCookies.has("sb-project-auth-token"), false); assert.equal(failed.requestCookies.get("sb-project-auth-token-code-verifier"), "pkce-verifier");
  assert.ok(cleared.writes.some(args => args[0] === "sb-project-auth-token" && args[2].maxAge === 0));
  assert.equal(cleared.headers.get("Cache-Control"), "private, no-store");
});
