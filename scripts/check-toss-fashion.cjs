#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Read-only diagnosis on Lightsail. Never prints credentials or product/link bodies.
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

function fashionCategories(nodes) {
  const rootNames = ["패션", "남성패션", "여성패션", "유아동패션"];
  const normalize = (name) => name.replace(/[\s/·&-]/g, "");
  const roots = [];
  const result = [], seen = new Set();
  const valid = (node) => node && Number.isSafeInteger(node.categoryId) && node.categoryId > 0 && typeof node.displayName === "string";
  function add(node, label) {
    if (!valid(node) || seen.has(node.categoryId)) return;
    seen.add(node.categoryId);
    result.push({ categoryId: node.categoryId, displayName: node.displayName, label });
  }
  function visit(list, depth) {
    if (!Array.isArray(list) || depth > 5) return;
    for (const node of list) {
      if (!valid(node)) continue;
      if (/반려|애완|강아지|고양이|펫/.test(node.displayName)) continue;
      if (rootNames.includes(normalize(node.displayName))) roots.push(node);
      visit(node.children, depth + 1);
    }
  }
  visit(nodes, 1);
  roots.sort((a, b) => rootNames.indexOf(normalize(a.displayName)) - rootNames.indexOf(normalize(b.displayName)));
  for (const root of roots) {
    add(root, root.displayName);
    if (Array.isArray(root.children)) {
      for (const child of root.children) {
        if (valid(child)) add(child, rootNames.includes(normalize(child.displayName)) ? child.displayName : `${root.displayName} > ${child.displayName}`);
      }
    }
  }
  return result;
}

function localConfig() {
  const service = "toss-sharelink-proxy.service";
  const pid = Number(execFileSync("systemctl", ["show", service, "--property=MainPID", "--value"], { encoding: "utf8" }).trim());
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("SERVICE_NOT_RUNNING");
  const entries = fs.readFileSync("/proc/" + pid + "/environ", "utf8").split("\0").filter(Boolean).map((entry) => {
    const index = entry.indexOf("="); return [entry.slice(0, index), entry.slice(index + 1)];
  });
  const keys = [...new Set(entries.filter(([name, value]) => /PROXY/i.test(name) && /(?:KEY|SECRET|TOKEN)$/i.test(name) && value).map(([, value]) => value))];
  if (keys.length !== 1) throw new Error("PROXY_KEY_NOT_IDENTIFIED");
  const sockets = execFileSync("ss", ["-H", "-ltnp"], { encoding: "utf8" }).split("\n").filter((line) => line.includes("pid=" + pid + ","));
  const ports = [...new Set(sockets.map((line) => Number(line.trim().split(/\s+/)[3]?.match(/:(\d+)$/)?.[1])).filter((port) => Number.isInteger(port) && port > 0))];
  if (ports.length !== 1) throw new Error("PROXY_PORT_NOT_IDENTIFIED");
  return { origin: "http://127.0.0.1:" + ports[0], key: keys[0] };
}

function safeCode(value) {
  return typeof value === "string" && /^[A-Z0-9_]{1,120}$/.test(value) ? value : "UNKNOWN_ERROR";
}
async function request(config, route, fetcher) {
  const response = await fetcher(config.origin + route, {
    method: "GET", headers: { "x-proxy-api-key": config.key },
    redirect: "error", signal: AbortSignal.timeout(15000),
  });
  let body;
  try { body = await response.json(); } catch { return { http: response.status, error: "INVALID_JSON" }; }
  const cache = response.headers.get("x-proxy-cache");
  const result = { http: response.status, cache: cache === "HIT" || cache === "MISS" ? cache : "UNKNOWN" };
  if (!response.ok || body?.resultType !== "SUCCESS") return { ...result, error: safeCode(body?.error?.errorCode) };
  return { ...result, success: body.success };
}

async function diagnose(config, { fetcher = fetch, log = console.log } = {}) {
  const taxonomy = await request(config, "/v1/categories", fetcher);
  if (!Array.isArray(taxonomy.success?.categories)) {
    log("카테고리 목록 조회 실패:", taxonomy.http, taxonomy.error ?? "INVALID_RESPONSE");
    return false;
  }
  const categories = fashionCategories(taxonomy.success.categories);
  log("사이트와 동일한 분류·조회 크기(size=50)로 확인합니다. 분류 수:", categories.length);
  log("카테고리 ID | 이름 | HTTP | 결과 | 원본 상품 | 품절 제외 | 캐시 | 오류 코드");
  let complete = categories.length > 0;
  for (const category of categories.slice(0, 60)) {
    const label = category.label.replace(/[\p{Cc}\p{Cf}|]/gu, " ").slice(0, 60);
    let result;
    try {
      result = await request(config, "/v1/products/best-categories/" + category.categoryId + "?size=50", fetcher);
    } catch {
      result = { http: "-", error: "REQUEST_FAILED" };
    }
    const items = result.success?.items;
    const valid = !result.error && Array.isArray(items) && result.success?.category?.categoryId === category.categoryId;
    const count = valid ? items.length : "-";
    const available = valid ? items.filter((item) => item && !item.isSoldOut).length : "-";
    const state = valid ? (count === 0 ? "EMPTY" : available === 0 ? "SOLD_OUT" : "HAS_PRODUCTS") : "ERROR";
    log([category.categoryId, label, result.http, state, count, available, result.cache ?? "-", valid ? "-" : result.error ?? "INVALID_RESPONSE"].join(" | "));
    if (!valid) complete = false;
    // Avoid extra requests when the proxy is rejecting authentication or throttling.
    if ([401, 403, 429].includes(result.http)) { log("인증·요청 제한 응답으로 나머지 조회를 중단했습니다."); return false; }
  }
  if (categories.length > 60) { log("요청 수 보호를 위해 60개까지만 확인했습니다."); complete = false; }
  log("EMPTY: 이 API 순위 응답이 0개라는 뜻이며, 토스 전체에 상품이 없다는 의미는 아닙니다.");
  log("HIT: 프록시 캐시 응답입니다. 순위 캐시는 다음 오전 9시(KST)에 만료됩니다.");
  log("품절 제외 수는 링크 발급 전 수치입니다. 링크 발급·사이트 표시 여부는 별도 확인이 필요합니다.");
  return complete;
}

module.exports = { fashionCategories, diagnose };
if (require.main === module) {
  (async () => {
    if (!process.getuid || process.getuid() !== 0) throw new Error("SUDO_REQUIRED");
    console.log("토스 패션 API 조회 점검. 파일 변경·서비스 재시작·링크 생성 없음.");
    if (!await diagnose(localConfig())) process.exitCode = 2;
  })().catch((error) => {
    console.error("점검 미완료:", safeCode(error.message));
    process.exitCode = 1;
  });
}
