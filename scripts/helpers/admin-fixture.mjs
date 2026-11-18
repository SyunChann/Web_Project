import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

export async function renderAdminFixture(scenario = "normal") {
  const calls = [];
  const owner = "owner";
  const user = scenario === "anonymous" ? null : { id: owner, email: "admin-fixture@example.com" };
  const client = { auth: { getUser: async () => ({ data: { user } }) }, from(table) {
    calls.push(table);
    let scope = "";
    const query = {
      select() { return query; }, order() { return query; }, limit() { return query; },
      eq(key, value) { if (key === "scope") scope = value; return query; }, or(value) { scope = value; return query; },
      then(resolve, reject) {
        const error = (scenario === "invite-error" && table === "invite_codes") || (scenario === "content-error" && table === "watchlist_items");
        const data = table === "invite_codes" ? [{ id: "invite", code: "INV-FIXTURE", max_uses: 2, used_count: 1, expires_at: "2027-01-01T00:00:00Z", revoked_at: null, created_at: "2026-11-16T00:00:00Z" }]
          : table === "drink_posts" ? [{ id: "drink-own", name: "관리자 위스키", author_id: owner, author_name: "관리자", images: [], created_at: "2026-11-16T12:00:00Z" }, { id: "drink-other", name: "다른 회원의 사케", author_id: "other", author_name: "회원", images: [], created_at: "2026-11-16T11:00:00Z" }]
            : [{ id: table + scope, title: table === "restaurant_reviews" ? (scope === "overseas" ? "해외 맛집 기록" : "국내 맛집 기록") : "최근 콘텐츠", author_name: "작성자", created_at: "2026-11-15T00:00:00Z", summary: "요약", reason: "기대 이유", thumbnail: null, latitude: 0, longitude: 0 }];
        return Promise.resolve({ data: error ? null : data, error: error ? { message: "fixture failure" } : null, count: table === "invite_codes" ? 1 : table === "drink_posts" ? 2 : 2400 }).then(resolve, reject);
      },
    }; return query;
  } };
  const modules = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "next/link": { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) },
    "next/headers": { headers: async () => new Headers({ host: "localhost:4281" }) },
    "next/navigation": { redirect: (href) => { throw new Error(`REDIRECT:${href}`); } },
    "lucide-react": new Proxy({}, { get: () => () => React.createElement("svg", { "aria-hidden": true, width: 16, height: 16 }) }),
    "@/components/AppNav": { AppNav: () => React.createElement("nav", null, "관리자 메뉴") },
    "@/components/ConfirmSubmitButton": { ConfirmSubmitButton: ({ triggerLabel }) => React.createElement("button", { type: "submit" }, triggerLabel) },
    "@/components/CopyButton": { CopyButton: ({ label }) => React.createElement("button", { type: "button" }, label) },
    "@/components/admin/AdminApiStatus": { AdminApiStatus: () => React.createElement("section", { id: "api-status" }, "외부 API 운영 현황") },
    "./actions": { createInviteCode: async () => {}, revokeInviteCode: async () => {} },
    "@/lib/admin": { getAdminConfiguration: () => ({ emails: [user?.email], source: "environment" }), isAdminUser: () => scenario !== "member" },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => client },
  };
  function load(path) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, { exports, require: name => modules[name] ?? {}, Headers, process: { env: { DATA_GO_KR_API_KEY: "fixture-secret-marker" } } });
    return exports;
  }
  modules["@/lib/adminContent"] = load("src/lib/adminContent.ts");
  modules["@/data/admin"] = load("src/data/admin.ts");
  modules["@/components/admin/AdminServices"] = load("src/components/admin/AdminServices.tsx");
  const page = load("src/app/admin/page.tsx").default;
  return { html: renderToStaticMarkup(await page({ searchParams: Promise.resolve({}) })), calls };
}
