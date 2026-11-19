import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import FileResolver from "@swagger-api/apidom-reference/resolve/resolvers/file";

// 실제 Swagger 파일 리졸버로 minimatch의 메이저 업데이트 호환성을 확인합니다.
test("Swagger file resolver preserves its allowlist with patched minimatch in ESM and CommonJS", () => {
  const require = createRequire(import.meta.url);
  const CommonJsResolver = require("@swagger-api/apidom-reference/resolve/resolvers/file").default;
  for (const Resolver of [FileResolver, CommonJsResolver]) {
    const resolver = new Resolver({ fileAllowList: ["/specs/**/*.yaml"] });
    assert.equal(resolver.canRead({ uri: "/specs/openapi.yaml" }), true);
    assert.equal(resolver.canRead({ uri: "/specs/nested/schema.yaml" }), true);
    assert.equal(resolver.canRead({ uri: "/private/secrets.yaml" }), false);
    assert.equal(resolver.canRead({ uri: "https://example.invalid/specs/openapi.yaml" }), false);
    assert.equal(new Resolver().canRead({ uri: "/specs/openapi.yaml" }), false);
  }
});
