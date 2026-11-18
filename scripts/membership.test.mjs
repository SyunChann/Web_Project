import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function harness(options = {}) {
  const values = new Map(), calls = [], env = { ...options.env };
  const redirect = href => { throw Object.assign(Error("redirect"), { href }); };
  const user = options.user === undefined ? { id: "owner", email: "owner@example.com", email_confirmed_at: "2026-11-18" } : options.user;
  const auth = {
    getUser: async () => ({ data: { user } }),
    signUp: async args => { calls.push(["signup", args]); return { data: { session: null }, error: options.mailError }; },
    resend: async args => { calls.push(["resend", args]); return { error: options.mailError }; },
    signOut: async () => { calls.push(["signout"]); if (options.logoutThrows) throw Error("logout"); return {}; },
    verifyOtp: async args => { calls.push(["verify", args]); return { data: { user }, error: options.verifyError }; },
    exchangeCodeForSession: async args => { calls.push(["exchange", args]); return { data: { user }, error: options.verifyError }; },
    refreshSession: async () => ({}),
  };
  const client = { auth, rpc: async (name, args) => { calls.push([name, args]); return { data: options.available !== false, error: options.rpcError }; } };
  const modules = {
    "next/navigation": { redirect }, "next/cache": { revalidatePath() {} },
    "next/headers": { cookies: async () => ({ get: name => values.has(name) ? { value: values.get(name) } : undefined, set: (name, value) => values.set(name, value), delete: name => values.delete(name) }) },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => client },
    "@/lib/siteUrl": { getSiteUrl: () => "https://site.example" },
    "@/lib/supabase/config": { supabaseUrl: "https://fixture.supabase.co", supabaseKey: "public-fixture" },
    "@/lib/admin": { isAdminUser: () => Boolean(options.admin) },
    "@supabase/supabase-js": { createClient: (_url, key) => {
      calls.push(["client", key]);
      if (key === "private-marker") return {
        from: () => { const query = { select: () => query, eq: (_column, id) => { calls.push(["postOwner", id]); return query; }, order: () => query, range: async () => ({ data: [{ images: ["owner/attached.jpg"] }], error: null }) }; return query; },
        storage: { from: () => ({ list: async prefix => { calls.push(["photoOwner", prefix]); return { data: [{ name: "attached.jpg" }, { name: "unused.jpg" }], error: null }; }, remove: async paths => { calls.push(["removePhotos", paths]); return { error: options.storageError }; } }) },
        rpc: async (name, args) => { calls.push([name, args]); return { error: options.deleteError }; },
      };
      return { auth: { signInWithPassword: async args => { calls.push(["password", args]); return { data: { user: options.passwordUser ?? user }, error: options.passwordError }; }, signOut: async () => ({}) } };
    } },
  };
  function load(path) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => modules[name] ?? {}, process: { env }, Date, FormData, TextEncoder, URLSearchParams, AbortSignal });
    return exports;
  }
  modules["@/lib/membership"] = load("src/lib/membership.ts");
  return { values, calls, load, model: modules["@/lib/membership"] };
}
function form(overrides = {}) { const result = new FormData(); for (const [key, value] of Object.entries({ nickname: "취향기록", email: "person@example.com", password: "password-123", confirm_password: "password-123", terms: "on", privacy: "on", ...overrides })) result.set(key, value); return result; }
async function redirected(promise, href) { await assert.rejects(promise, error => error.href === href); }
test("signup needs consent, matching passwords and bounded UTF-8 credentials before requesting mail", async () => {
  for (const [data, error] of [[{ terms: "" }, "consent"], [{ nickname: "admin" }, "nickname"], [{ email: "bad" }, "email"], [{ confirm_password: "different" }, "mismatch"], [{ password: "가".repeat(25) }, "password"]]) {
    const h = harness(); await redirected(h.load("src/app/signup/actions.ts").signUp(form(data)), `/signup?error=${error}`); assert.equal(h.calls.length, 0);
  }
});
test("public signup has no invitation dependency and uses the fixed confirmation origin", async () => {
  const h = harness(); await redirected(h.load("src/app/signup/actions.ts").signUp(form()), "/signup?status=confirm_email");
  const args = h.calls.find(call => call[0] === "signup")[1];
  assert.equal(args.options.emailRedirectTo, "https://site.example/auth/confirm"); assert.equal(args.options.data.nickname, "취향기록"); assert.equal(args.options.data.terms_version, "2026-11-18"); assert.ok(!JSON.stringify(h.calls).includes("invite"));
});
test("mail quota and SMTP authorization failures never pretend mail was sent", async () => {
  for (const [mailError, error] of [[{ status: 429 }, "limited"], [{ code: "email_address_not_authorized" }, "sender"], [{ code: "captcha_failed" }, "captcha"]]) {
    const h = harness({ mailError }); await redirected(h.load("src/app/signup/actions.ts").signUp(form()), `/signup?error=${error}`);
  }
});
test("taken nickname or missing CAPTCHA prevents signup", async () => {
  const taken = harness({ available: false }); await redirected(taken.load("src/app/signup/actions.ts").signUp(form()), "/signup?error=taken"); assert.ok(!taken.calls.some(x => x[0] === "signup"));
  const captcha = harness({ env: { NEXT_PUBLIC_TURNSTILE_SITE_KEY: "public" } }); await redirected(captcha.load("src/app/signup/actions.ts").signUp(form()), "/signup?error=captcha"); assert.equal(captcha.calls.length, 0);
});
test("resending stays signup-only, observes cooldown and avoids account enumeration", async () => {
  const h = harness({ mailError: { code: "user_not_found" } }); const action = h.load("src/app/signup/actions.ts");
  await redirected(action.resendSignupEmail(form()), "/signup?status=resent");
  await redirected(action.resendSignupEmail(form()), "/signup?error=limited");
  assert.equal(h.calls.filter(x => x[0] === "resend").length, 1); assert.equal(h.calls[0][1].type, "signup");
});
test("confirmation consumes the credential only on explicit submission and displays success despite logout failure", async () => {
  const h = harness({ logoutThrows: true }); h.values.set("signup_confirmation", "hash:token");
  await redirected(h.load("src/app/confirm-email/actions.ts").confirmEmail(), "/login?status=confirmed");
  assert.equal(h.calls[0][0], "verify"); assert.equal(h.values.has("signup_confirmation"), false);
});
test("invalid confirmation never verifies and expired credentials return to resend", async () => {
  const missing = harness(); await redirected(missing.load("src/app/confirm-email/actions.ts").confirmEmail(), "/signup?error=expired"); assert.equal(missing.calls.length, 0);
  const h = harness({ verifyError: {} }); h.values.set("signup_confirmation", "hash:expired"); await redirected(h.load("src/app/confirm-email/actions.ts").confirmEmail(), "/signup?error=expired");
});
test("nickname change is authenticated and reports atomic database conflicts", async () => {
  const guest = harness({ user: null }); await redirected(guest.load("src/app/account/actions.ts").changeNickname(form()), "/login"); assert.equal(guest.calls.length, 0);
  const taken = harness({ rpcError: { code: "23505" } }); await redirected(taken.load("src/app/account/actions.ts").changeNickname(form()), "/account?error=taken");
});
test("only an authenticated administrator may request an operator nickname", async () => {
  const member = harness(); await redirected(member.load("src/app/account/actions.ts").changeNickname(form({ nickname: "관리자", is_admin: "true" })), "/account?error=nickname"); assert.equal(member.calls.length, 0);
  const admin = harness({ admin: true }); await redirected(admin.load("src/app/account/actions.ts").changeNickname(form({ nickname: "관리자" })), "/account?status=saved"); assert.equal(admin.calls[0][0], "change_nickname_v1");
  assert.equal(admin.model.validNickname("탈퇴한회원", true), false);
  assert.equal(admin.model.validNickname("<관리자>", true), false);
});
test("signup cannot use operator names even when a logged-in administrator submits it", async () => {
  const h = harness({ admin: true }); await redirected(h.load("src/app/signup/actions.ts").signUp(form({ nickname: "관리자" })), "/signup?error=nickname"); assert.equal(h.calls.length, 0);
});
test("withdrawal rejects guests/admins and forged password identities before using a privileged key", async () => {
  for (const [opts, target] of [[{ user: null }, "/login"], [{ admin: true }, "/account?error=admin"], [{ passwordUser: { id: "other" }, env: { SUPABASE_SERVICE_ROLE_KEY: "private-marker" } }, "/account?error=current"]]) {
    const h = harness(opts); await redirected(h.load("src/app/account/actions.ts").withdrawAccount(form({ current_password: "password", withdraw_confirm: "탈퇴", user_id: "other" })), target);
    assert.ok(!h.calls.some(x => x[0] === "client" && x[1] === "private-marker"));
  }
});
test("withdrawal scopes deletion to the verified user and preserves attached photos", async () => {
  const h = harness({ env: { SUPABASE_SERVICE_ROLE_KEY: "private-marker" } });
  await redirected(h.load("src/app/account/actions.ts").withdrawAccount(form({ current_password: "password", withdraw_confirm: "탈퇴", user_id: "victim" })), "/login?status=withdrawn");
  assert.equal(h.calls.find(x => x[0] === "close_member_account_v1")[1].p_user_id, "owner");
  assert.equal(h.calls.find(x => x[0] === "postOwner")[1], "owner"); assert.equal(h.calls.find(x => x[0] === "photoOwner")[1], "owner");
  assert.equal(JSON.stringify(h.calls.find(x => x[0] === "removePhotos")[1]), '["owner/unused.jpg"]');
});
test("storage cleanup failure leaves the account intact", async () => {
  const h = harness({ env: { SUPABASE_SERVICE_ROLE_KEY: "private-marker" }, storageError: {} });
  await redirected(h.load("src/app/account/actions.ts").withdrawAccount(form({ current_password: "password", withdraw_confirm: "탈퇴" })), "/account?error=save");
  assert.ok(!h.calls.some(x => x[0] === "close_member_account_v1"));
});
