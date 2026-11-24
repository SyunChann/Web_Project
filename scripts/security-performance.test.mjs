import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { webcrypto, createHmac } from "node:crypto";
import { isIP } from "node:net";
function load(path, modules = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { if (name === "server-only") return {}; if (name in modules) return modules[name]; throw Error(`Unmocked ${name}`); },
      File, FormData, Request, Response, URL, TextDecoder, Uint8Array, Error, crypto: webcrypto, AbortSignal, process: { env: {} }, ...globals });
  return exports;
}
const config = { supabaseUrl: "https://fixture.supabase.co", supabaseKey: "publishable-fixture" };
test("large GIF uploads go directly to authenticated Storage; action data contains only the reference", async () => {
  const uploads = [];
  const storage = { upload: async (...args) => { uploads.push(args); return {}; }, getPublicUrl: path => ({ data: { publicUrl: `${config.supabaseUrl}/storage/v1/object/public/review-thumbnails/${path}` } }) };
  const model = load("src/lib/thumbnailUpload.ts", {
    "@/lib/supabase/config": config,
    "@supabase/ssr": { createBrowserClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) }, storage: { from: () => storage } }) },
  });
  const data = new FormData(); data.set("title", "GIF review"); data.set("thumbnail_file", new File([new Uint8Array(2 * 1024 * 1024)], "large.gif", { type: "image/gif" }));
  await model.uploadFormThumbnail(data);
  assert.equal(uploads[0][1].size, 2 * 1024 * 1024); assert.equal(uploads[0][2].upsert, false);
  assert.match(uploads[0][0], /^owner\/[a-f0-9-]{36}\.gif$/);
  assert.equal(data.has("thumbnail_file"), false); assert.equal(data.get("title"), "GIF review");
  assert.match(data.get("uploaded_thumbnail"), /^https:\/\/fixture.supabase.co\/storage\/v1\/object\/public\/review-thumbnails\/owner\//);
  for (const [type,size] of [["image/svg+xml",10],["constructor",10],["image/png",5*1024*1024+1]]) {
    const invalid = new FormData(); invalid.set("thumbnail_file", new File([new Uint8Array(size)], "bad.png", { type }));
    await assert.rejects(model.uploadFormThumbnail(invalid));
  }
  assert.equal(uploads.length, 1);
});
test("server rejects foreign, malformed and missing thumbnail references without fetching arbitrary URLs", async () => {
  const calls = [];
  const model = load("src/lib/thumbnailReference.ts", { "@/lib/supabase/config": config });
  const name = "11111111-1111-4111-8111-111111111111.png";
  const good = `${config.supabaseUrl}/storage/v1/object/public/review-thumbnails/owner/${name}`;
  let metadata = { size: 42, mimetype: "image/png" };
  const client = { storage: { from: () => ({ list: async (owner, options) => { calls.push({ owner, options }); return { data: [{ name, metadata }] }; } }) } };
  const data = new FormData(); data.set("uploaded_thumbnail", good);
  assert.equal(await model.readUploadedThumbnail(client, data, "owner"), good);
  assert.equal(calls[0].owner, "owner"); assert.equal(calls[0].options.search, name);
  for (const value of [good.replace("/owner/","/victim/"),good.replace("fixture.supabase.co","evil.test"),good+"?x=1",good.replace(name,"../"+name),good.replace(".png",".svg")]) {
    data.set("uploaded_thumbnail", value); await assert.rejects(model.readUploadedThumbnail(client,data,"owner"));
  }
  assert.equal(calls.length, 1);
  data.set("uploaded_thumbnail",good); metadata = { size: 6*1024*1024, mimetype: "image/png" };
  await assert.rejects(model.readUploadedThumbnail(client,data,"owner"));
  metadata = { size: 42, mimetype: "image/svg+xml" }; await assert.rejects(model.readUploadedThumbnail(client,data,"owner"));
});
test("Discord notifications defer delivery, set a timeout and never log webhook error details", async () => {
  const callbacks = [], logs = [], requests = [];
  const model = load("src/lib/discord.ts", { "next/server": { after: callback => callbacks.push(callback) } }, {
    process: { env: { DISCORD_MONITORING_WEBHOOK_URL: "https://fixture.invalid/private-webhook" } },
    fetch: async (url, options) => { requests.push({url,options}); throw Error("private-webhook-secret"); }, console: { warn: (...args) => logs.push(args) },
  });
  await model.notifyDiscord({title:"fixture"}); assert.equal(requests.length,0); assert.equal(callbacks.length,1);
  await callbacks[0](); assert.equal(requests[0].options.cache,"no-store"); assert.ok(requests[0].options.signal instanceof AbortSignal);
  assert.ok(!JSON.stringify(logs).includes("private-webhook"));
});
test("nickname endpoint limits calls before checking availability and bounds actual streamed JSON bytes", async () => {
  const small = load("src/lib/smallJsonBody.ts"); const membership = load("src/lib/membership.ts");
  let mode="blocked", checks=0;
  const endpoint = load("src/app/api/account/nickname/route.ts", {
    "next/server": { NextResponse: { json: (body,init) => Response.json(body,init) } }, "@/lib/membership": membership, "@/lib/smallJsonBody": small,
    "@/lib/nicknameRateLimit": { checkNicknameRateLimit: async () => { if(mode==="down")throw Error("private");return { allowed: mode!=="blocked",retryAfter:17 }; } },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ rpc: async () => {checks++;return { data:true };} }) },
  });
  const request = body => new Request("https://fixture.invalid",{method:"POST",body});
  let response=await endpoint.POST(request('{"nickname":"테스트닉"}')); assert.equal(response.status,429);assert.equal(response.headers.get("retry-after"),"17");assert.equal(checks,0);
  mode="down";response=await endpoint.POST(request('{}'));assert.equal(response.status,503);assert.equal(checks,0);
  mode="ok";response=await endpoint.POST(request('{"nickname":"테스트닉"}'));assert.equal(response.status,200);assert.equal(checks,1);
  response=await endpoint.POST(new Request("https://fixture.invalid",{method:"POST",headers:{"content-length":"1"},body:JSON.stringify({nickname:"가".repeat(1000)})}));assert.equal(response.status,413);assert.equal(checks,1);
  response=await endpoint.POST(request('{'));assert.equal(response.status,400);assert.equal(checks,1);
});
test("nickname rate keys are stable private HMACs and storage failures never bypass limits", async () => {
  const keys=[]; let fails=false;
  const model = load("src/lib/nicknameRateLimit.ts", {
    "node:crypto": { createHmac }, "node:net": { isIP },
    "@supabase/supabase-js": { createClient: () => ({ rpc: async (_name,args) => {keys.push(args.p_key);return fails?{error:{}}:{data:{allowed:true,retry_after:0}};} }) },
  }, { process:{env:{NEXT_PUBLIC_SUPABASE_URL:config.supabaseUrl,SUPABASE_SERVICE_ROLE_KEY:"private-server-fixture",VERCEL:"1"}} });
  for(const ip of ["192.0.2.1","192.0.2.1","192.0.2.2"])await model.checkNicknameRateLimit(new Request("https://fixture.invalid",{headers:{"x-forwarded-for":ip}}));
  assert.equal(keys[0],keys[1]);assert.notEqual(keys[1],keys[2]);assert.match(keys[0],/^[a-f0-9]{64}$/);assert.ok(!keys.join("").includes("192.0.2"));
  fails=true;await assert.rejects(model.checkNicknameRateLimit(new Request("https://fixture.invalid")));
});
