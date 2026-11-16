import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(readFileSync(new URL("../src/lib/incheonAirport.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const instant = Date.parse("2026-11-16T23:00:00+09:00");
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [instant])); }
  static now() { return instant; }
}
const flight = (overrides = {}) => ({
  flightId: "KE123", airportCode: "FUK", airport: "후쿠오카", airline: "대한항공",
  scheduleDateTime: "202611162330", terminalid: "P03", gatenumber: "251", ...overrides,
});
const envelope = (items, totalCount) => ({ response: { header: { resultCode: "00" }, body: {
  items, ...(totalCount === undefined ? {} : { totalCount }),
} } });
const response = (payload, status = 200, date = "Mon, 16 Nov 2026 14:00:00 GMT") => ({
  ok: status >= 200 && status < 300, status, headers: { get: () => date },
  text: async () => typeof payload === "string" ? payload : JSON.stringify(payload),
});
function service(handler, env = { DATA_GO_KR_API_KEY: "mock-key" }) {
  const exports = {};
  const calls = [];
  vm.runInNewContext(source, {
    exports, require: () => ({}), process: { env }, URLSearchParams, AbortSignal, Date: FixedDate,
    console: { error() {} }, fetch: async (url, options) => {
      const query = new URL(url).searchParams;
      calls.push({ query, options });
      return handler(query, calls.length);
    },
  });
  return { get: exports.getJapanDepartures, calls };
}

test("missing key does not contact upstream", async () => {
  const { get, calls } = service(() => { throw Error("unexpected"); }, {});
  assert.equal((await get()).state, "missing-key");
  assert.equal(calls.length, 0);
});
test("malformed envelopes are errors rather than an empty timetable", async () => {
  for (const payload of [{}, null, [], { response: {} }, { response: { header: { resultCode: "00" } } },
    envelope({}), envelope([null]), envelope([{ flightId: 3 }]), envelope([], -1), envelope([], "invalid"), envelope([], null)]) {
    const { get, calls } = service(() => response(payload));
    assert.equal((await get()).state, "unavailable", JSON.stringify(payload));
    assert.equal(calls.length, 1);
  }
});
test("valid empty responses check tomorrow before declaring no flights", async () => {
  for (const payload of [envelope([], 0), envelope("", "0"), envelope({ item: [] }, 0),
    { response: { header: { resultCode: "03" } } }, "<resultCode>03</resultCode>"]) {
    const { get, calls } = service(() => response(payload));
    assert.equal((await get()).state, "empty");
    assert.equal(calls.length, 2);
    assert.equal(calls[1].query.get("searchday"), "20261117");
  }
});
test("tomorrow's time-only flights use the requested date and revised time", async () => {
  const { get } = service((query) => response(query.get("searchday") === "20261116" ? envelope([], 0)
    : envelope([flight({ scheduleDateTime: "0610", estimatedDateTime: "0630" })], 1)));
  const result = await get();
  assert.equal(result.state, "ready");
  assert.equal(result.range, "tomorrow-morning");
  assert.equal(result.flights[0].scheduledAt, "2026-11-17T06:10:00+09:00");
  assert.equal(result.flights[0].revisedAt, "2026-11-17T06:30:00+09:00");
});
test("calendar overflow and invalid hours do not appear as valid flights", async () => {
  const { get } = service(() => response(envelope([
    flight({ scheduleDateTime: "202611162530" }), flight({ scheduleDateTime: "202611310610" }),
  ], 2)));
  assert.equal((await get()).state, "empty");
});
test("colon-separated and numeric time-only values retain the requested day", async () => {
  for (const value of ["06:10", "06:10:00", 610]) {
    const { get } = service((query) => response(query.get("searchday") === "20261116" ? envelope([], 0)
      : envelope([flight({ scheduleDateTime: value, estimatedDateTime: "06:30" })], 1)));
    const result = await get();
    assert.equal(result.state, "ready");
    assert.equal(result.flights[0].scheduledAt, "2026-11-17T06:10:00+09:00");
    assert.equal(result.flights[0].revisedAt, "2026-11-17T06:30:00+09:00");
  }
});
test("numeric midnight and formatted local dates are accepted", async () => {
  const { get } = service((query) => response(query.get("searchday") === "20261116" ? envelope([], 0)
    : envelope([flight({ scheduleDateTime: 0, estimatedDateTime: "2026-11-17T00:15:00+09:00" })], 1)));
  const result = await get();
  assert.equal(result.state, "ready");
  assert.equal(result.flights[0].scheduledAt, "2026-11-17T00:00:00+09:00");
  assert.equal(result.flights[0].revisedAt, "2026-11-17T00:15:00+09:00");
});
test("fourteen-digit dates preserve seconds and distinguish unchanged estimates", async () => {
  const { get } = service(() => response(envelope({ item: flight({
    scheduleDateTime: "20261116233015", estimatedDateTime: "20261116233015",
  }) }, "1")));
  const result = await get();
  assert.equal(result.state, "ready");
  assert.equal(result.flights[0].scheduledAt, "2026-11-16T23:30:15+09:00");
  assert.equal(result.flights[0].revisedAt, undefined);
});
test("time-only estimates crossing midnight roll into the next day", async () => {
  const { get, calls } = service(() => response(envelope([flight({ estimatedDateTime: "0010" })], 1)));
  const result = await get();
  assert.equal(result.state, "ready");
  assert.equal(result.range, "tomorrow-morning");
  assert.equal(Date.parse(result.flights[0].revisedAt), Date.parse("2026-11-17T00:10:00+09:00"));
  assert.equal(calls.length, 2);
});
test("Japan filter, codeshares, terminal and status mapping are retained", async () => {
  const { get } = service(() => response(envelope([
    flight({ flightId: "KE100", airportCode: "LAX" }), flight({ flightId: "KE200", codeshare: "Slave" }),
    flight({ flightId: "KE300", airportCode: "OIT", remark: "탑승 마감" }),
  ], 3)));
  const result = await get();
  assert.equal(result.flights.length, 1);
  assert.equal(result.flights[0].destinationCode, "OIT");
  assert.equal(result.flights[0].terminal, "T2");
  assert.equal(result.flights[0].status, "탑승 마감");
});
test("Japan flights beyond the first 500 results are fetched", async () => {
  const first = Array.from({ length: 500 }, (_, i) => flight({ flightId: `US${i}`, airportCode: "LAX" }));
  const { get, calls } = service((query) => response(envelope(query.get("pageNo") === "1" ? first : [flight()], 501)));
  const result = await get();
  assert.equal(result.state, "ready");
  assert.equal(result.flights.length, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].query.get("pageNo"), "2");
  assert.equal(calls[0].options.next.revalidate, 300);
});
test("reported totals handle servers capping each page below the requested size", async () => {
  const { get, calls } = service((query) => response(envelope(query.get("pageNo") === "1"
    ? [flight({ flightId: "US1", airportCode: "LAX" }), flight({ flightId: "US2", airportCode: "LAX" })]
    : [flight()], 3)));
  assert.equal((await get()).state, "ready");
  assert.equal(calls.length, 2);
});
test("a full page without a total continues to the next page", async () => {
  const first = Array.from({ length: 500 }, (_, i) => flight({ flightId: `US${i}`, airportCode: "LAX" }));
  const { get, calls } = service((query) => response(envelope(query.get("pageNo") === "1" ? first : [flight()])));
  assert.equal((await get()).state, "ready");
  assert.equal(calls.length, 2);
});
test("no-data codes end pagination when the upstream omitted the total", async () => {
  const first = Array.from({ length: 500 }, (_, i) => flight({ flightId: `KE${i}` }));
  for (const empty of [{ response: { header: { resultCode: "03" } } }, "<resultCode>03</resultCode>"]) {
    const { get, calls } = service((query) => response(query.get("pageNo") === "1" ? envelope(first) : empty));
    const result = await get();
    assert.equal(result.state, "ready");
    assert.equal(result.flights.length, 500);
    assert.equal(calls.length, 2);
  }
});
test("repeated pages and prematurely empty pages never return a partial board", async () => {
  for (const second of [[flight()], []]) {
    const { get, calls } = service((query) => response(envelope(query.get("pageNo") === "1" ? [flight()] : second, 2)));
    assert.equal((await get()).state, "unavailable");
    assert.equal(calls.length, 2);
  }
});
test("changing pagination totals fail explicitly", async () => {
  const { get } = service((query) => response(envelope([flight()], query.get("pageNo") === "1" ? 2 : 3)));
  assert.equal((await get()).state, "unavailable");
});
test("later-page failure is reported instead of presenting an incomplete timetable", async () => {
  const { get } = service((query) => query.get("pageNo") === "1" ? response(envelope([flight()], 2)) : response({}, 429));
  assert.equal((await get()).state, "rate-limit");
});
test("JSON gateway and XML authentication errors do not expose upstream messages", async () => {
  for (const payload of [
    { OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: "30", errMsg: "secret-key" } } },
    "<returnReasonCode>30</returnReasonCode><errMsg>secret-key</errMsg>",
  ]) {
    const { get } = service(() => response(payload));
    const result = await get();
    assert.equal(result.state, "authentication");
    assert.ok(!JSON.stringify(result).includes("secret-key"));
  }
});
test("non-numeric error diagnostics are not forwarded to the browser", async () => {
  const { get } = service(() => response({ response: { header: { resultCode: "SERVICE_KEY_secret" } } }));
  const result = await get();
  assert.equal(result.state, "authentication");
  assert.equal(result.diagnostic, undefined);
});
test("encoded keys remain server-side and invalid response dates are safe", async () => {
  const { get, calls } = service(() => response(envelope([flight()], 1), 200, "invalid"), { DATA_GO_KR_API_KEY: "abc%2Bdef%3D" });
  const result = await get();
  assert.equal(result.state, "ready");
  assert.equal(calls[0].query.get("serviceKey"), "abc+def=");
  assert.ok(!JSON.stringify(result).includes("abc"));
  assert.ok(Number.isFinite(Date.parse(result.updatedAt)));
});
