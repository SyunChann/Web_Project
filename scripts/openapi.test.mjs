import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import SwaggerParser from "@apidevtools/swagger-parser";

function load(file, modules = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => {
    if (name === "server-only") return {};
    if (!(name in modules)) throw Error(`Unmocked dependency: ${name}`);
    return modules[name];
  }, URL, Request, Response });
  return exports;
}
const spec = JSON.parse(JSON.stringify(load("src/lib/internalOpenApi.ts").internalOpenApi));
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };

test("OpenAPI 3 document validates and covers every business Route Handler", async () => {
  await SwaggerParser.validate(structuredClone(spec));
  const operations = [];
  const root = new URL("../src/app/api/", import.meta.url);
  for (const file of readdirSync(root, { recursive: true })) {
    if (!file.endsWith("route.ts") || file === "admin/openapi/route.ts") continue;
    const source = readFileSync(new URL(file, root), "utf8");
    const path = `/api/${file.replace(/\/route\.ts$/, "")}`;
    for (const [, method] of source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\(/g)) operations.push(`${method.toLowerCase()} ${path}`);
  }
  assert.deepEqual(Object.entries(spec.paths).flatMap(([path, methods]) => Object.keys(methods).map(method => `${method} ${path}`)).sort(), operations.sort());
  assert.equal(spec.servers[0].url, "/");
});

test("spec JSON independently enforces admin access and private caching", async () => {
  for (const [scenario, expected] of [["anonymous", 401], ["expired", 401], ["member", 403], ["admin", 200], ["unconfigured", 503], ["network", 503], ["throws", 503]]) {
    const { GET } = load("src/app/api/admin/openapi/route.ts", {
      "next/server": next,
      "@/lib/internalOpenApi": { internalOpenApi: spec },
      "@/lib/admin": { isAdminUser: user => user.email === "admin@example.test" },
      "@/lib/supabase/server": { createSupabaseServerClient: async () => {
        if (scenario === "unconfigured") return null;
        if (scenario === "throws") throw Error("private-fixture-secret");
        return { auth: { getUser: async () => ({ data: { user: scenario === "anonymous" ? null : { email: scenario === "admin" ? "admin@example.test" : "member@example.test" } }, error: scenario === "network" ? { status: 503 } : scenario === "expired" ? { status: 401 } : null }) } };
      } },
    });
    const response = await GET();
    assert.equal(response.status, expected, scenario);
    assert.match(response.headers.get("cache-control"), /private, no-store/);
    assert.equal(response.headers.get("vary"), "Cookie");
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    assert.ok(!(await response.text()).includes("private-fixture-secret"));
  }
});

test("Swagger execution policy rejects mutations, other paths and off-site servers", () => {
  const { restrictSwaggerRequest } = load("src/lib/swaggerRequestPolicy.ts");
  const origin = "https://preview.example.test";
  const allowed = restrictSwaggerRequest({ url: "/api/anilist/releases?year=2026&quarter=4", method: "GET" }, origin);
  assert.equal(allowed.credentials, "same-origin");
  for (const request of [
    { url: "/api/account/nickname", method: "POST" },
    { url: "/api/anilist/releases", method: "DELETE" },
    { url: "https://outside.example.test/api/anilist/releases", method: "GET" },
    { url: "/api/admin/openapi", method: "GET" },
    { url: "https://user:pass@preview.example.test/api/anilist/releases", method: "GET" },
  ]) assert.throws(() => restrictSwaggerRequest(request, origin));
});

test("documented anime success response preserves query defaults and empty-result behavior", async () => {
  const { GET } = load("src/app/api/anilist/releases/route.ts", {
    "next/server": next,
    "@/data/anilist": { getCurrentAniListQuarter: () => 4, getAniListQuarterReleases: async () => [] },
  });
  for (const [query, year, quarter] of [["year=2026&quarter=2", 2026, 2], ["year=1999&quarter=9", new Date().getFullYear(), 4], ["year=2026&quarter=1.5", 2026, 1.5]]) {
    const response = await GET({ nextUrl: new URL(`https://example.test/api/anilist/releases?${query}`) });
    assert.ok(spec.paths["/api/anilist/releases"].get.responses[response.status]);
    assert.deepEqual(await response.json(), { year, quarter, items: [] });
  }
});

test("nickname docs cover actual validation, duplicate, malformed JSON and service failure responses", async () => {
  const membership = load("src/lib/membership.ts");
  for (const [nickname, dbResult, expected, available] of [["술친구_01", true, 200, true], ["술친구_01", false, 200, false], ["관리자", true, 400, false], [" 공백 ", true, 400, false], ["술친구_01", null, 503, undefined]]) {
    const { POST } = load("src/app/api/account/nickname/route.ts", {
      "next/server": next, "@/lib/membership": membership,
      "@/lib/supabase/server": { createSupabaseServerClient: async () => dbResult === null ? null : { rpc: async () => ({ data: dbResult, error: null }) } },
    });
    const response = await POST(new Request("https://example.test", { method: "POST", body: JSON.stringify({ nickname }) }));
    assert.equal(response.status, expected);
    assert.ok(spec.paths["/api/account/nickname"].post.responses[response.status]);
    assert.equal((await response.json()).available, available);
    const oversized = await POST(new Request("https://example.test", { method: "POST", headers: { "Content-Length": "1025" }, body: "{}" }));
    assert.equal(oversized.status, 400);
    const invalidJson = await POST(new Request("https://example.test", { method: "POST", body: "{" }));
    assert.equal(invalidJson.status, 503);
  }
});
