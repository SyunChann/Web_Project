import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

function load({ env = {}, fetch = async () => { throw new Error("unexpected fetch"); } } = {}) {
  const filename = fileURLToPath(new URL("../src/lib/incheonCongestion.ts", import.meta.url));
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const moduleRecord = { exports: {} };
  vm.runInNewContext(source, {
    module: moduleRecord, exports: moduleRecord.exports,
    require: () => ({}), URLSearchParams, AbortSignal, fetch, process: { env },
  }, { filename });
  return moduleRecord.exports;
}

const { parseCongestionResponse: parse } = load();
const lane = { gateId: "DG1_E", terminalId: "P01", waitLength: "15", waitTime: "3", occurtime: "20261116160300" };
const envelope = (items, code = "00") => JSON.stringify({ response: { header: { resultCode: code }, body: { items } } });

test("T1 parses per-lane counts, wait time and KST observation", () => {
  const result = parse(envelope([lane]), "T1");
  assert.equal(result.state, "ready");
  assert.equal(result.gates[0].waitingPeople, 15);
  assert.equal(result.gates[0].waitMinutes, 3);
  assert.equal(result.gates[0].observedAt, "2026-11-16T16:03:00+09:00");
});
test("T2 parses A-D zones independently of T1", () => {
  const result = parse(envelope([{ ...lane, gateId: "DG2_D", terminalId: "P03" }, lane]), "T2");
  assert.equal(result.gates.length, 1);
  assert.equal(result.gates[0].number, 2);
  assert.equal(result.gates[0].lane, "D");
});
test("wrapped arrays and single-item wrappers are accepted", () => {
  assert.equal(parse(envelope({ item: [lane] }), "T1").state, "ready");
  assert.equal(parse(envelope({ item: lane }), "T1").state, "ready");
});
test("zero is preserved but absent, negative and invalid metrics stay unknown", () => {
  const zero = parse(envelope([{ ...lane, waitLength: "0", waitTime: 0 }]), "T1").gates[0];
  assert.equal(zero.waitingPeople, 0);
  assert.equal(zero.waitMinutes, 0);
  for (const value of [undefined, null, "", "-", "-1", "abc", false]) {
    const gate = parse(envelope([{ ...lane, waitLength: value, waitTime: value }]), "T1").gates[0];
    assert.equal(gate.waitingPeople, null);
    assert.equal(gate.waitMinutes, null);
  }
});
test("duplicate lanes choose the newest observation", () => {
  const old = { ...lane, waitLength: "99", occurtime: "20261116150000" };
  assert.equal(parse(envelope([old, lane, old]), "T1").gates[0].waitingPeople, 15);
});
test("invalid dates and unknown zones do not produce misleading observations", () => {
  assert.equal(parse(envelope([{ ...lane, occurtime: "20260230160300" }]), "T1").gates[0].observedAt, null);
  assert.equal(parse(envelope([{ ...lane, gateId: "DG9_Z" }]), "T1").state, "empty");
  assert.equal(parse(envelope([{ ...lane, terminalId: "P03" }]), "T1").state, "empty");
});
test("empty, malformed and incomplete envelopes remain distinct", () => {
  assert.equal(parse(envelope([]), "T1").state, "empty");
  assert.equal(parse(envelope("", "03"), "T1").state, "empty");
  assert.equal(parse("{broken", "T1").state, "unavailable");
  assert.equal(parse("{}", "T1").state, "unavailable");
});
test("XML and JSON gateway authentication errors are recognized", () => {
  assert.equal(parse("<returnReasonCode>30</returnReasonCode>", "T1").state, "authentication");
  const gateway = JSON.stringify({ OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: "20" } } });
  assert.equal(parse(gateway, "T2").state, "authentication");
  assert.equal(parse(envelope([], "22"), "T1").state, "rate-limit");
});
test("keys stay in server request and missing key does not fetch", async () => {
  const service = load();
  assert.equal((await service.getDepartureCongestion("T1")).state, "missing-key");
});
test("separate keys, correct operations and cache intervals are used", async () => {
  const calls = [];
  const service = load({
    env: { ICN_CONGESTION_T1_API_KEY: "test%2Bkey%2F%3D", ICN_CONGESTION_T2_API_KEY: "different+key/=", DATA_GO_KR_API_KEY: "fallback" },
    fetch: async (url, options) => { calls.push([new URL(url), options]); return { ok: true, text: async () => envelope([]) }; },
  });
  await service.getDepartureCongestion("T1");
  await service.getDepartureCongestion("T2");
  assert.equal(calls[0][0].pathname, "/B551177/statusOfDepartureCongestion/getDepartureCongestion");
  assert.equal(calls[1][0].pathname, "/B551177/statusOfDepartureCongestionT2/getDepartureCongestionT2");
  assert.equal(calls[0][0].searchParams.get("serviceKey"), "test+key/=");
  assert.equal(calls[1][0].searchParams.get("serviceKey"), "different+key/=");
  assert.equal(calls[0][0].searchParams.get("terminalId"), "P01");
  assert.equal(calls[1][0].searchParams.has("terminalId"), false);
  assert.equal(calls[0][1].next.revalidate, 120);
});
test("existing general key is a fallback and is not included in returned data", async () => {
  const service = load({ env: { DATA_GO_KR_API_KEY: "private-test-key" }, fetch: async (url) => {
    assert.equal(new URL(url).searchParams.get("serviceKey"), "private-test-key");
    return { ok: true, text: async () => envelope([lane]) };
  } });
  assert.equal(JSON.stringify(await service.getDepartureCongestion("T1")).includes("private-test-key"), false);
});
test("T1 outage does not prevent T2 from returning data", async () => {
  const service = load({ env: { DATA_GO_KR_API_KEY: "test" }, fetch: async (url) => {
    if (url.includes("CongestionT2")) return { ok: true, text: async () => envelope([{ ...lane, gateId: "DG1_A", terminalId: "P03" }]) };
    throw new Error("network outage");
  } });
  const [t1, t2] = await Promise.all([service.getDepartureCongestion("T1"), service.getDepartureCongestion("T2")]);
  assert.equal(t1.state, "unavailable");
  assert.equal(t2.state, "ready");
});
test("HTTP rate limiting is handled without parsing or leaking upstream details", async () => {
  const service = load({ env: { DATA_GO_KR_API_KEY: "test" }, fetch: async () => ({ ok: false, status: 429 }) });
  assert.equal((await service.getDepartureCongestion("T2")).state, "rate-limit");
});
