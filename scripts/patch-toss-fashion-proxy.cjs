#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Run on the existing Lightsail server. Never prints credentials or upstream bodies.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const MARKER = "// BEGIN TOSS FASHION PROXY ROUTES v1";
const ROUTES = String.raw`
// BEGIN TOSS FASHION PROXY ROUTES v1
const tossFashionRouteCache = new Map();
const tossFashionRouteLoads = new Map();
async function tossFashionProxyRead(upstreamPath, cacheKey, expiresAt) {
  const cached = tossFashionRouteCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { ...cached.result, cache: "HIT" };
  let pending = tossFashionRouteLoads.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      const result = await tossRequest(upstreamPath);
      if (!result || !Number.isInteger(result.status) || result.data === undefined) {
        throw new Error("Unexpected tossRequest result shape");
      }
      if (result.status === 200 && result.data && result.data.resultType === "SUCCESS" && expiresAt > Date.now()) {
        tossFashionRouteCache.delete(cacheKey);
        tossFashionRouteCache.set(cacheKey, { result, expiresAt });
        if (tossFashionRouteCache.size > 32) tossFashionRouteCache.delete(tossFashionRouteCache.keys().next().value);
      }
      return result;
    })();
    tossFashionRouteLoads.set(cacheKey, pending);
  }
  try { return { ...await pending, cache: "MISS" }; }
  finally { if (tossFashionRouteLoads.get(cacheKey) === pending) tossFashionRouteLoads.delete(cacheKey); }
}
app.get("/v1/categories", proxyKeyMiddleware, asyncHandler(async (req, res) => {
  const result = await tossFashionProxyRead("/categories", "categories", Date.now() + 6 * 60 * 60 * 1000);
  res.set("X-Proxy-Cache", result.cache);
  return res.status(result.status).json(result.data);
}));
app.get("/v1/products/best-categories/:categoryId", proxyKeyMiddleware, asyncHandler(async (req, res) => {
  const categoryId = Number(req.params.categoryId);
  const rawSize = req.query.size;
  const size = Number(rawSize === undefined ? 50 : rawSize);
  const cursor = req.query.cursor;
  if (!/^[1-9]\d*$/.test(req.params.categoryId) || !Number.isSafeInteger(categoryId)
    || (rawSize !== undefined && typeof rawSize !== "string") || !Number.isSafeInteger(size) || size < 1 || size > 100
    || (cursor !== undefined && (typeof cursor !== "string" || cursor.length > 2048))) {
    return res.status(400).json({ resultType: "FAIL", error: { errorCode: "INVALID_ARGUMENT", reason: "카테고리와 조회 범위를 확인해 주세요." } });
  }
  const query = new URLSearchParams({ size: String(size) });
  if (cursor) query.set("cursor", cursor);
  const upstreamPath = "/products/best-categories/" + categoryId + "?" + query.toString();
  const expiresAt = (Math.floor(Date.now() / 86400000) + 1) * 86400000;
  const result = await tossFashionProxyRead(upstreamPath, upstreamPath, expiresAt);
  res.set("X-Proxy-Cache", result.cache);
  return res.status(result.status).json(result.data);
}));
// END TOSS FASHION PROXY ROUTES v1

`;

function buildPatch(source) {
  if (source.includes(MARKER)) return source;
  if (/['"]\/v1\/(?:categories|products\/best-categories)/.test(source)) {
    throw new Error("기존 카테고리 경로가 있어 자동 수정을 중단했습니다.");
  }
  if (!/async\s+function\s+tossRequest\s*\(\s*path\s*,\s*options\s*=\s*\{\}/.test(source)
    || !/function\s+asyncHandler\s*\(/.test(source)
    || !/function\s+proxyKeyMiddleware\s*\([^,]+,[^,]+,[^)]+\)/.test(source)
    || !/tossRequest\s*\(\s*['"`]\/products\/best-selling\?/.test(source)) {
    throw new Error("확인한 서버 구조와 달라 원본을 수정하지 않았습니다.");
  }
  const anchor = /\bapp\.get\s*\(\s*(['"])\/v1\/products\/best-selling\1\s*,/.exec(source);
  if (!anchor) throw new Error("기존 베스트 상품 경로를 찾지 못했습니다.");
  return source.slice(0, anchor.index) + ROUTES + source.slice(anchor.index);
}

function installProxy({ target, service = "toss-sharelink-proxy.service", run = execFileSync }) {
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("일반 server.js 파일만 수정할 수 있습니다.");
  const source = fs.readFileSync(target, "utf8");
  const patched = buildPatch(source);
  if (patched === source) return { changed: false };
  const stamp = new Date().toISOString().replace(/[^0-9TZ]/g, "");
  const backup = target + ".backup-fashion-" + stamp + "-" + process.pid;
  const temporary = path.join(path.dirname(target), ".fashion-patch-" + process.pid + ".js");
  fs.copyFileSync(target, backup, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(backup, 0o600);
  let changed = false;
  let stage = "문법 검사";
  try {
    fs.writeFileSync(temporary, patched, { flag: "wx", mode: stat.mode & 0o777 });
    fs.chmodSync(temporary, stat.mode & 0o777);
    run(process.execPath, ["--check", temporary], { stdio: "pipe" });
    if (process.getuid && process.getuid() === 0) fs.chownSync(temporary, stat.uid, stat.gid);
    fs.renameSync(temporary, target);
    changed = true;
    stage = "서비스 재시작";
    run("systemctl", ["restart", service], { stdio: "pipe" });
    run("systemctl", ["is-active", "--quiet", service], { stdio: "pipe" });
    return { changed: true, backup };
  } catch {
    if (changed) {
      fs.copyFileSync(backup, target);
      fs.chmodSync(target, stat.mode & 0o777);
      if (process.getuid && process.getuid() === 0) fs.chownSync(target, stat.uid, stat.gid);
      try { run("systemctl", ["restart", service], { stdio: "pipe" }); }
      catch { throw new Error("원본 파일은 복구했으나 서비스 재시작에 실패했습니다. 백업: " + backup); }
    }
    throw new Error(stage + " 실패. 원본 파일을 유지 또는 복구했습니다. 백업: " + backup);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

async function probeProxy(service) {
  const pid = Number(execFileSync("systemctl", ["show", service, "--property=MainPID", "--value"], { encoding: "utf8" }).trim());
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("서비스 PID를 찾지 못했습니다.");
  const env = Object.fromEntries(fs.readFileSync("/proc/" + pid + "/environ", "utf8").split("\0").filter(Boolean).map((entry) => {
    const index = entry.indexOf("="); return [entry.slice(0, index), entry.slice(index + 1)];
  }));
  const keys = [...new Set(Object.entries(env).filter(([name, value]) => /PROXY/i.test(name) && /(?:KEY|SECRET|TOKEN)$/i.test(name) && value).map(([, value]) => value))];
  let ports = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    const sockets = execFileSync("ss", ["-H", "-ltnp"], { encoding: "utf8" }).split("\n").filter((line) => line.includes("pid=" + pid + ","));
    ports = [...new Set(sockets.map((line) => Number(line.trim().split(/\s+/)[3]?.match(/:(\d+)$/)?.[1])).filter((port) => Number.isInteger(port) && port > 0))];
    if (ports.length) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (ports.length !== 1) throw new Error("서비스 포트를 자동 확인하지 못했습니다. 사이트에서 조회 결과를 확인해 주세요.");
  const origin = "http://127.0.0.1:" + ports[0];
  const anonymous = await fetch(origin + "/v1/categories", { signal: AbortSignal.timeout(10000) });
  console.log("인증 없는 요청 HTTP:", anonymous.status);
  if (![401, 403].includes(anonymous.status)) {
    const error = new Error("인증 차단을 확인하지 못했습니다. 서비스 설정 검토가 필요합니다.");
    error.authCheckFailed = true;
    throw error;
  }
  if (keys.length !== 1) throw new Error("기존 인증키를 자동 확인하지 못했습니다. 키는 출력하지 않았습니다. 사이트에서 조회 결과를 확인해 주세요.");
  async function request(route) {
    const response = await fetch(origin + route, { headers: { "x-proxy-api-key": keys[0] }, signal: AbortSignal.timeout(15000) });
    let data; try { data = await response.json(); } catch { data = null; }
    const rawCode = data?.error?.errorCode;
    const code = typeof rawCode === "string" && /^[A-Z0-9_]{1,120}$/.test(rawCode) ? rawCode : "없음";
    console.log(route.split("?")[0] + " HTTP:", response.status, "결과:", data?.resultType === "SUCCESS" ? "SUCCESS" : "FAIL", "오류 코드:", code);
    return response.ok && data?.resultType === "SUCCESS" ? data.success : null;
  }
  const categories = await request("/v1/categories");
  if (!Array.isArray(categories?.categories)) return false;
  console.log("상위 카테고리 수:", categories.categories.length);
  const names = new Set(["패션", "남성패션", "여성패션", "남성의류", "여성의류", "패션잡화", "신발", "가방", "주얼리", "쥬얼리", "시계", "유아동패션"]);
  function findFashion(nodes, depth = 0) {
    if (!Array.isArray(nodes) || depth > 5) return null;
    for (const node of nodes) {
      if (Number.isSafeInteger(node?.categoryId) && names.has(String(node.displayName).replace(/[\s/·&-]/g, ""))) return node;
      const child = findFashion(node?.children, depth + 1);
      if (child) return child;
    }
    return null;
  }
  const fashion = findFashion(categories.categories);
  if (!fashion) { console.log("카테고리는 정상 조회됐으나 패션 분류 이름 확인이 필요합니다."); return false; }
  console.log("확인한 패션 카테고리 ID:", fashion.categoryId);
  const products = await request("/v1/products/best-categories/" + fashion.categoryId + "?size=1");
  if (!Array.isArray(products?.items)) return false;
  console.log("패션 조회 검증 완료. 응답 상품 수:", products.items.length);
  return true;
}

module.exports = { buildPatch, installProxy, ROUTES, MARKER };
if (require.main === module) {
  (async () => {
    if (!process.getuid || process.getuid() !== 0) throw new Error("sudo node로 실행해 주세요.");
    const target = process.argv[2] || "/opt/toss-sharelink-proxy/server.js";
    const service = "toss-sharelink-proxy.service";
    const result = installProxy({ target, service });
    console.log(result.changed ? "카테고리 경로 2개 적용 및 서비스 재시작 완료." : "이미 같은 패치가 적용돼 있습니다.");
    if (result.backup) console.log("원본 백업:", result.backup);
    try {
      if (!await probeProxy(service)) { console.log("코드 적용은 유지했습니다. 위 상태·오류 코드만 공유해 주세요."); process.exitCode = 2; }
    } catch (error) {
      if (error.authCheckFailed && result.backup) {
        const stat = fs.statSync(target);
        fs.copyFileSync(result.backup, target);
        fs.chmodSync(target, stat.mode & 0o777);
        fs.chownSync(target, stat.uid, stat.gid);
        execFileSync("systemctl", ["restart", service], { stdio: "pipe" });
        console.log("인증 차단 검증에 실패해 원본으로 복구했습니다.");
      } else {
        console.log("코드 적용은 유지했습니다. 자동 검증 미완료. 사이트에서 조회 결과를 확인해 주세요.");
      }
      process.exitCode = 2;
    }
  })().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
