import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const loadDependency = createRequire(import.meta.url);
function load(path, overrides = {}, mocks = {}) {
  const filename = fileURLToPath(new URL(`../${path}`, import.meta.url));
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const moduleRecord = { exports: {} };
  vm.runInNewContext(compiled, {
    module: moduleRecord, exports: moduleRecord.exports,
    require: (name) => name === "server-only" ? {} : name in mocks ? mocks[name] : loadDependency(name),
    URL, URLSearchParams, AbortSignal, console, process, ...overrides,
  }, { filename });
  return moduleRecord.exports;
}

const images = load("src/lib/tossProductImages.ts");
const original = "https://images.example.com/original.jpg?signature=keep%2Fthis&size=original";
const product = { tacaItemId: 123, thumbnailUrl: original };

test("ID settings ignore wildcards, invalid IDs and unsafe numbers", () => {
  assert.deepEqual([...images.parseTossProductIds("123, 456,123,*,0,-1,1.5,bad,9007199254740992")], [123, 456]);
});
test("unreviewed products do not expose images", () => {
  assert.equal(images.getTossThumbnailUrl(product, new Set(), new Set()), null);
});
test("withdrawal overrides approval", () => {
  assert.equal(images.getTossThumbnailUrl(product, new Set([123]), new Set([123])), null);
});
test("approved image uses exact original URL without resizing parameters", () => {
  assert.equal(images.getTossThumbnailUrl(product, new Set([123]), new Set()), original);
});
test("missing and invalid images fall back to text", () => {
  for (const thumbnailUrl of [null, undefined, "", "not-a-url", "http://example.com/a.jpg", "javascript:alert(1)", "https://user:pass@example.com/a.jpg"]) {
    assert.equal(images.getTossThumbnailUrl({ ...product, thumbnailUrl }, new Set([123]), new Set()), null);
  }
});
test("original images bypass optimization and retain natural proportions", () => {
  const { TossProductImage } = load("src/components/TossProductImage.tsx");
  const html = renderToStaticMarkup(createElement(TossProductImage, { src: original, name: "상품" }));
  assert.ok(html.includes("original.jpg?signature=keep%2Fthis&amp;size=original"));
  assert.ok(html.includes("height:auto"));
  assert.ok(!html.includes("/_next/image"));
  assert.ok(!html.includes("object-fit:cover"));
  assert.equal(renderToStaticMarkup(createElement(TossProductImage, { src: null, name: "상품" })), "");
});
test("image load failure removes the image while the surrounding card stays independent", () => {
  const { TossProductImage } = load("src/components/TossProductImage.tsx", {}, {
    react: { useState: () => [original, () => {}] },
  });
  assert.equal(TossProductImage({ src: original, name: "상품" }), null);
});

function setupApi() {
  let now = 1_800_000_000_000;
  let unavailable = false;
  const calls = [];
  class TestDate extends Date { static now() { return now; } }
  const service = load("src/lib/tossSharelink.ts", {
    Date: TestDate,
    process: { env: { TOSS_PROXY_BASE_URL: "https://proxy.example", TOSS_PROXY_API_KEY: "test-only" } },
    console: { error() {} },
    fetch: async (url, options) => {
      calls.push({ url, method: options?.method ?? "GET" });
      if (unavailable) throw new Error("fixture outage");
      let success;
      if (url.includes("best-selling")) success = { items: [{ ...product, displayName: "상품", displayPrice: 1000, isSoldOut: false }] };
      else if (url.includes("detail")) success = { items: [{ tacaItemId: 123, displayName: "상품", displayPrice: 1000, isSoldOut: false }] };
      else success = { shortUrl: "https://toss.im/test" };
      return { ok: true, json: async () => ({ resultType: "SUCCESS", success }) };
    },
  });
  return { service, calls, advance: (ms) => { now += ms; }, fail: () => { unavailable = true; } };
}
test("list thumbnail survives detail enrichment without extra image API calls", async () => {
  const { service, calls } = setupApi();
  const result = await service.getTossSharelinkContent();
  assert.equal(result.status, "ready");
  assert.equal(result.products[0].thumbnailUrl, original);
  assert.equal(calls.length, 3); // Existing list, detail and tracked-link requests only.
});
test("permission removal still applies to an already cached product", async () => {
  const { service, calls } = setupApi();
  const first = await service.getTossSharelinkContent();
  assert.equal(images.getTossThumbnailUrl(first.products[0], new Set([123]), new Set()), original);
  const cached = await service.getTossSharelinkContent();
  assert.equal(images.getTossThumbnailUrl(cached.products[0], new Set([123]), new Set([123])), null);
  assert.equal(calls.length, 3);
});
test("upstream outages never extend product data beyond 24 hours", async () => {
  const { service, advance, fail } = setupApi();
  await service.getTossSharelinkContent();
  fail();
  advance(23 * 60 * 60 * 1000);
  assert.equal((await service.getTossSharelinkContent()).status, "ready");
  advance(60 * 60 * 1000);
  assert.equal((await service.getTossSharelinkContent()).status, "error");
});

for (const loggedIn of [false, true]) {
  test(`image settings block ${loggedIn ? "non-admin" : "anonymous"} access before loading products`, async () => {
    let requested = false;
    const page = load("src/app/admin/toss-images/page.tsx", {}, {
      "next/navigation": {
        redirect: () => { throw new Error("login-required"); },
        notFound: () => { throw new Error("admin-required"); },
      },
      "@/components/CopyButton": {},
      "@/lib/admin": { isAdminUser: () => false },
      "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: {
        getUser: async () => ({ data: { user: loggedIn ? { id: "regular-user" } : null } }),
      } }) },
      "@/lib/tossSharelink": { getTossSharelinkContent: () => { requested = true; } },
      "@/lib/tossProductImages": images,
    });
    await assert.rejects(page.default(), new RegExp(loggedIn ? "admin-required" : "login-required"));
    assert.equal(requested, false);
  });
}
