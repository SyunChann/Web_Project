// Local authentication contract tests; no live accounts, mail, or Supabase writes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const loadDependency = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));

function load(relativePath, mocks = {}) {
  const filename = resolve(scriptDirectory, "..", relativePath);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const moduleRecord = { exports: {} };
  const run = vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename });
  run((name) => name in mocks ? mocks[name] : loadDependency(name), moduleRecord, moduleRecord.exports);
  return moduleRecord.exports;
}

const recovery = load("src/lib/passwordRecovery.ts");

function setup({ credential = "token_hash:valid", verificationError = null, updateError = null,
  currentError = null, mailError = null, user = { id: "u1", email: "person@example.com" } } = {}) {
  const calls = [];
  const values = new Map(credential ? [[recovery.recoveryCookieName, credential]] : []);
  const auth = {
    async getUser() { return { data: { user } }; },
    async resetPasswordForEmail(email, options) { calls.push(["mail", email, options]); return { error: mailError }; },
    async verifyOtp(options) { calls.push(["verify", options]); return { error: verificationError, data: { session: verificationError ? null : {} } }; },
    async exchangeCodeForSession(code) { calls.push(["exchange", code]); return { error: verificationError, data: { session: verificationError ? null : {} } }; },
    async updateUser(options) { calls.push(["update", options]); return { error: updateError }; },
    async signOut(options) { calls.push(["logout", options]); return { error: null }; },
  };
  const actions = load("src/app/actions/password.ts", {
    "next/navigation": { redirect: (location) => { throw Object.assign(new Error("redirect"), { location }); } },
    "next/headers": { cookies: async () => ({ get: (name) => values.has(name) ? { value: values.get(name) } : undefined, delete: (name) => values.delete(name) }) },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth }) },
    "@/lib/supabase/config": { supabaseUrl: "https://example.supabase.co", supabaseKey: "test-only" },
    "@/lib/siteUrl": { getSiteUrl: () => "https://site.example" },
    "@/lib/passwordRecovery": recovery,
    "@supabase/supabase-js": { createClient: () => ({ auth: {
      async signInWithPassword(options) { calls.push(["reauth", options]); return { error: currentError, data: { user: currentError ? null : user } }; },
      async signOut(options) { calls.push(["verifierLogout", options]); return { error: null }; },
    } }) },
  });
  return { actions, calls, values };
}

function form(fields = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ password: "new-password-123", confirm_password: "new-password-123", ...fields })) data.set(key, value);
  return data;
}

async function redirected(promise, location) {
  await assert.rejects(promise, (error) => error.location === location);
}

test("password validation covers mismatches and UTF-8 byte limits", () => {
  assert.equal(recovery.validateNewPassword("short", "short"), "weak");
  assert.equal(recovery.validateNewPassword("abcdefgh", "abcdefgi"), "mismatch");
  assert.equal(recovery.validateNewPassword("가".repeat(25), "가".repeat(25)), "long");
  assert.equal(recovery.validateNewPassword("가".repeat(24), "가".repeat(24)), null);
  assert.equal(recovery.parseRecoveryCredential("garbage"), null);
  assert.equal(recovery.parseRecoveryCredential("code:"), null);
});

test("email reset uses the configured site and does not disclose unknown accounts", async () => {
  const { actions, calls } = setup({ mailError: { code: "user_not_found" } });
  await redirected(actions.requestPasswordReset(form({ email: "person@example.com" })), "/forgot-password?status=sent");
  assert.equal(calls[0][2].redirectTo, "https://site.example/auth/recovery");
});

test("email rate limiting has a friendly outcome", async () => {
  const { actions } = setup({ mailError: { status: 429 } });
  await redirected(actions.requestPasswordReset(form({ email: "person@example.com" })), "/forgot-password?error=limited");
});

test("reset without recovery credential never updates a user", async () => {
  const { actions, calls } = setup({ credential: null });
  await redirected(actions.resetPassword(form()), "/forgot-password?error=expired");
  assert.equal(calls.length, 0);
});

test("mismatched passwords do not consume a recovery credential", async () => {
  const { actions, calls, values } = setup();
  await redirected(actions.resetPassword(form({ confirm_password: "different" })), "/reset-password?error=mismatch");
  assert.equal(calls.length, 0);
  assert.ok(values.has(recovery.recoveryCookieName));
});

test("expired or reused recovery tokens cannot update a password", async () => {
  const { actions, calls, values } = setup({ verificationError: { code: "otp_expired" } });
  await redirected(actions.resetPassword(form()), "/forgot-password?error=expired");
  assert.equal(calls.some(([name]) => name === "update"), false);
  assert.equal(values.size, 0);
});

for (const credential of ["token_hash:valid", "code:valid"]) {
  test(`verified ${credential.split(":")[0]} updates password and requests global logout`, async () => {
    const { actions, calls, values } = setup({ credential });
    await redirected(actions.resetPassword(form()), "/login?status=password_reset");
    assert.equal(calls[1][0], "update");
    assert.equal(calls[2][1].scope, "global");
    assert.equal(values.size, 0);
  });
}

test("rejected password updates clear one-time credentials and terminate recovery session", async () => {
  const { actions, calls, values } = setup({ updateError: { code: "same_password" } });
  await redirected(actions.resetPassword(form()), "/forgot-password?error=same");
  assert.equal(calls.at(-1)[1].scope, "local");
  assert.equal(values.size, 0);
});

test("logged-out visitors cannot submit a password change", async () => {
  const { actions, calls } = setup({ user: null });
  await redirected(actions.changePassword(form({ current_password: "old-password" })), "/login");
  assert.equal(calls.length, 0);
});

test("wrong current password never updates password or replaces session", async () => {
  const { actions, calls } = setup({ currentError: { status: 400 } });
  await redirected(actions.changePassword(form({ current_password: "incorrect" })), "/change-password?error=current");
  assert.equal(calls.some(([name]) => name === "update" || name === "logout"), false);
});

test("password change reauthenticates before updating and logging out", async () => {
  const { actions, calls } = setup();
  await redirected(actions.changePassword(form({ current_password: "old-password" })), "/login?status=password_changed");
  assert.deepEqual(calls.map(([name]) => name), ["reauth", "verifierLogout", "update", "logout"]);
});

test("recovery route stores credentials privately without verifying them on GET", async () => {
  const { NextRequest } = loadDependency("next/server");
  const route = load("src/app/auth/recovery/route.ts", { "@/lib/passwordRecovery": recovery });
  const response = await route.GET(new NextRequest("https://site.example/auth/recovery?token_hash=secret&type=recovery&next=https://evil.example"));
  assert.equal(response.headers.get("location"), "https://site.example/reset-password");
  const cookie = response.cookies.get(recovery.recoveryCookieName);
  assert.equal(cookie.value, "token_hash:secret");
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("recovery route rejects non-recovery token hashes", async () => {
  const { NextRequest } = loadDependency("next/server");
  const route = load("src/app/auth/recovery/route.ts", { "@/lib/passwordRecovery": recovery });
  const response = await route.GET(new NextRequest("https://site.example/auth/recovery?token_hash=secret&type=signup"));
  assert.equal(response.headers.get("location"), "https://site.example/forgot-password?error=expired");
});
