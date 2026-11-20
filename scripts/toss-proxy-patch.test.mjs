import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const { buildPatch, installProxy, MARKER } = createRequire(import.meta.url)("./patch-toss-fashion-proxy.cjs");
const source = `
function proxyKeyMiddleware(req, res, next) { if (!req.authorized) return res.status(401).json({}); return next(); }
async function tossRequest(path, options = {}, retry = true) { return upstream(path); }
function asyncHandler(handler) { return handler; }
app.get('/v1/products/best-selling', asyncHandler(async (req, res) => {
  return tossRequest('/products/best-selling?size=1');
}));
app.get('/health', () => {});
`;
function server(upstream, start = Date.UTC(2026, 10, 20, 23, 59, 59)) {
  const routes = new Map();
  let now = start;
  vm.runInNewContext(buildPatch(source), {
    app: { get: (route, ...handlers) => routes.set(route, handlers) },
    upstream, URLSearchParams, Date: { now: () => now },
  });
  return {
    routes, setTime: (value) => { now = value; },
    async request(route, { authorized = true, params = {}, query = {} } = {}) {
      const req = { authorized, params, query };
      const res = { headers: {}, statusCode: 200, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } };
      const handlers = routes.get(route);
      let index = 0;
      await (function next() { return handlers[index++]?.(req, res, next); })();
      return res;
    },
  };
}
const success = { status: 200, data: { resultType: "SUCCESS", success: { items: [] } } };
const categoryRoute = "/v1/products/best-categories/:categoryId";

test("patch preserves existing routes and is idempotent; unexpected structures stay untouched", () => {
  const patched = buildPatch(source);
  assert.equal(buildPatch(patched), patched);
  assert.equal(patched.split(MARKER).length, 2);
  assert.ok(patched.endsWith(source.slice(source.indexOf("app.get('/v1/products/best-selling'"))));
  assert.throws(() => buildPatch(source.replace("function proxyKeyMiddleware", "function unknown")));
  assert.throws(() => buildPatch(source + '\napp.get("/v1/categories", fn);'));
});

test("both new routes reject unauthenticated requests before contacting Toss", async () => {
  let calls = 0;
  const app = server(async () => { calls++; return success; });
  for (const route of ["/v1/categories", categoryRoute]) {
    assert.equal((await app.request(route, { authorized: false })).statusCode, 401);
  }
  assert.equal(calls, 0);
});

test("categories preserve the response envelope and reuse a successful cache", async () => {
  const calls = [];
  const app = server(async (route) => { calls.push(route); return success; });
  const first = await app.request("/v1/categories");
  const second = await app.request("/v1/categories");
  assert.equal(first.data, success.data);
  assert.equal(first.headers["X-Proxy-Cache"], "MISS");
  assert.equal(second.headers["X-Proxy-Cache"], "HIT");
  assert.deepEqual(calls, ["/categories"]);
});

test("category requests encode cursors, isolate categories, and refresh at 09:00 KST", async () => {
  const calls = [];
  const app = server(async (route) => { calls.push(route); return success; });
  const args = { params: { categoryId: "10" }, query: { size: "2", cursor: "a&b=c" } };
  await app.request(categoryRoute, args);
  assert.equal((await app.request(categoryRoute, args)).headers["X-Proxy-Cache"], "HIT");
  await app.request(categoryRoute, { params: { categoryId: "11" } });
  app.setTime(Date.UTC(2026, 10, 21));
  assert.equal((await app.request(categoryRoute, args)).headers["X-Proxy-Cache"], "MISS");
  assert.deepEqual(calls, ["/products/best-categories/10?size=2&cursor=a%26b%3Dc", "/products/best-categories/11?size=50", "/products/best-categories/10?size=2&cursor=a%26b%3Dc"]);
});

test("invalid category IDs, bounds, and non-scalar query values never reach Toss", async () => {
  let calls = 0;
  const app = server(async () => { calls++; return success; });
  for (const categoryId of ["0", "-1", "1/2", "1e2", "9007199254740992"]) {
    assert.equal((await app.request(categoryRoute, { params: { categoryId } })).statusCode, 400);
  }
  for (const query of [{ size: "0" }, { size: "101" }, { size: "1.5" }, { size: ["1"] }, { cursor: {} }, { cursor: "a".repeat(2049) }]) {
    assert.equal((await app.request(categoryRoute, { params: { categoryId: "10" }, query })).statusCode, 400);
  }
  assert.equal(calls, 0);
});

test("upstream authorization and HTTP errors pass through without being cached", async () => {
  for (const status of [200, 403, 404, 429, 500]) {
    let calls = 0;
    const data = { resultType: "FAIL", error: { errorCode: "PARTNER_NOT_AUTHORIZED" } };
    const app = server(async () => { calls++; return { status, data }; });
    const first = await app.request("/v1/categories");
    await app.request("/v1/categories");
    assert.equal(first.statusCode, status);
    assert.equal(first.data, data);
    assert.equal(calls, 2);
  }
});

test("concurrent reads share one upstream call and recover after a rejection", async () => {
  let calls = 0;
  let resolve;
  const app = server(() => { calls++; return new Promise((done) => { resolve = done; }); });
  const first = app.request("/v1/categories");
  const second = app.request("/v1/categories");
  assert.equal(calls, 1);
  resolve(success);
  await Promise.all([first, second]);
  let failures = 0;
  const failing = server(async () => { failures++; throw new Error("unavailable"); });
  await assert.rejects(failing.request("/v1/categories"));
  await assert.rejects(failing.request("/v1/categories"));
  assert.equal(failures, 2);
});

for (const failure of [null, "syntax", "restart"]) {
  test(`installer backs up and ${failure ? "restores on " + failure + " failure" : "preserves permissions with idempotent installation"}`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "toss-patch-test-"));
    const target = path.join(dir, "server.js");
    fs.writeFileSync(target, source, { mode: 0o640 });
    fs.chmodSync(target, 0o640);
    let restarts = 0;
    const run = (command, args, options) => {
      if (command === process.execPath) {
        if (failure === "syntax") throw new Error("syntax rejected");
        return execFileSync(command, args, options);
      }
      assert.equal(command, "systemctl");
      if (args[0] === "restart" && ++restarts === 1 && failure === "restart") throw new Error("restart failed");
    };
    try {
      if (failure) {
        assert.throws(() => installProxy({ target, run }));
        assert.equal(fs.readFileSync(target, "utf8"), source);
        assert.equal(restarts, failure === "restart" ? 2 : 0);
      } else {
        const result = installProxy({ target, run });
        assert.equal(fs.readFileSync(result.backup, "utf8"), source);
        assert.equal(fs.statSync(result.backup).mode & 0o777, 0o600);
        assert.equal(fs.statSync(target).mode & 0o777, 0o640);
        assert.equal(installProxy({ target, run }).changed, false);
        assert.equal(restarts, 1);
      }
      assert.ok(!fs.readdirSync(dir).some((file) => file.startsWith(".fashion-patch")));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
}
