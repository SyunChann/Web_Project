import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path,modules={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,File,Uint8Array,Array,Error,String,require:name=>{if(name==='server-only')return {};if(!(name in modules))throw Error(name);return modules[name];}});return exports;}
const model=load('src/lib/memberProfile.ts');
function actions(options={}){
 const calls=[];const owner={id:'owner',email_confirmed_at:'2026-01-01'};
 const client = {
  auth: { getUser: async () => ({ data: { user: options.guest ? null : owner } }) },
  from: table => ({ update: value => {
   calls.push(['update', table, value]);
   return { eq: (column, id) => {
    calls.push(['owner', column, id]);
    return { select: () => ({ single: async () => ({ data: options.updateError ? null : {user_id:'owner'}, error: options.updateError }) }) };
   }};
  }}),
  storage: { from: bucket => ({
   upload: async (path, bytes, opts) => { calls.push(['upload',bucket,path,bytes.length,opts]); return {error:options.uploadError}; },
   remove: async paths => { calls.push(['remove',bucket,paths]); return {error:options.removeError}; }
  }) }
 };
 return {calls,api:load('src/app/account/profileActions.ts',{'@/lib/memberProfile':model,'@/lib/supabase/server':{createSupabaseServerClient:async()=>client},'next/cache':{revalidatePath:path=>calls.push(['refresh',path])}})};
}
function photoForm(file){const form=new FormData();form.set('photo',file);form.set('user_id','victim');return form;}
const validPhoto=()=>new File([new Uint8Array([82,73,70,70,4,0,0,0,87,69,66,80])],'avatar.webp',{type:'image/webp'});
test('profile validation limits introductions and rejects image type spoofing',()=>{assert.equal(model.validProfileBio('가'.repeat(120)),true);assert.equal(model.validProfileBio('😀'.repeat(121)),false);assert.equal(model.isProfileWebp(new Uint8Array([1,2,3])),false);assert.equal(model.profilePhotoPath('owner'),'owner/avatar.webp');});
test('profile mutations require a confirmed session',async()=>{const h=actions({guest:true});await assert.rejects(()=>h.api.saveProfilePhoto(photoForm(validPhoto())));await assert.rejects(()=>h.api.removeProfilePhoto());await assert.rejects(()=>h.api.saveProfileBio(new FormData()));assert.equal(h.calls.length,0);});
test('profile photo ignores forged owner fields and only replaces the signed-in user path',async()=>{const h=actions();const result=await h.api.saveProfilePhoto(photoForm(validPhoto()));assert.ok(result.message);assert.equal(h.calls[0][1],'profile-photos');assert.equal(h.calls[0][2],'owner/avatar.webp');assert.equal(h.calls[0][4].upsert,true);assert.equal(h.calls[1][2].avatar_path,'owner/avatar.webp');assert.equal(h.calls[2][2],'owner');});
test('oversized, wrong-MIME and spoofed profile files never reach storage',async()=>{for(const file of [new File(['bad'],'image.svg',{type:'image/svg+xml'}),new File([new Uint8Array(262145)],'large.webp',{type:'image/webp'}),new File(['bad'],'fake.webp',{type:'image/webp'})]){const h=actions();assert.ok((await h.api.saveProfilePhoto(photoForm(file))).error);assert.equal(h.calls.length,0);}});
test('failed uploads do not change saved profile; failed profile writes do not report success',async()=>{const h=actions({uploadError:{}});assert.ok((await h.api.saveProfilePhoto(photoForm(validPhoto()))).error);assert.equal(h.calls.length,1);const k=actions({updateError:{}});assert.ok((await k.api.saveProfilePhoto(photoForm(validPhoto()))).error);assert.ok(!k.calls.some(c=>c[0]==='refresh'));});
test('profile removal only touches the current user photo and preserves DB reference on storage failure',async()=>{const h=actions();assert.ok((await h.api.removeProfilePhoto()).message);assert.equal(h.calls[0][2][0],'owner/avatar.webp');assert.equal(h.calls[1][2].avatar_path,null);const k=actions({removeError:{}});assert.ok((await k.api.removeProfilePhoto()).error);assert.equal(k.calls.length,1);});
test('bio updates are length-limited, trimmed and owner-scoped',async()=>{const h=actions();const f=new FormData();f.set('bio','  취향 기록  ');assert.ok((await h.api.saveProfileBio(f)).message);assert.equal(h.calls[0][2].bio,'취향 기록');assert.equal(h.calls[1][2],'owner');const k=actions();f.set('bio','가'.repeat(121));assert.ok((await k.api.saveProfileBio(f)).error);assert.equal(k.calls.length,0);});
test('private profile and activity use request-scoped identity, short-lived URLs and bounded owner queries',async()=>{
 const calls=[];const client={storage:{from:bucket=>({createSignedUrl:async(path,expiry)=>{calls.push(['sign',bucket,path,expiry]);return {data:{signedUrl:'https://fixture/photo?token=private'}};}})},from:table=>{const q={select:fields=>{calls.push(['read',table,fields]);return q;},eq:(field,id)=>{calls.push(['owner',field,id]);return q;},maybeSingle:async()=>({data:{nickname:'나',bio:'소개',avatar_path:'owner/avatar.webp'}}),order:()=>q,limit:async size=>{calls.push(['limit',size]);return table==='travel'?{error:{}}:{count:2,data:[{id:'a/b',title:'내 기록',created_at:'2026-01-01'}]};}};return q;}};
 const api=load('src/data/memberProfile.ts',{'react':{cache:fn=>fn},'@/lib/memberProfile':model,'@/lib/supabase/session':{getSupabaseServerSession:async()=>({supabase:client,user:{id:'owner'}})}});
 assert.equal((await api.getMemberProfile()).bio,'소개');assert.equal(calls.find(c=>c[0]==='sign')[3],300);const activity=await api.getMemberActivity();assert.equal(activity.length,6);assert.equal(activity.find(x=>x.label==='여행 기록').count,null);assert.equal(activity.find(x=>x.label==='기대작').records[0].href,'/watchlist/a%2Fb');assert.equal(activity.find(x=>x.label==='맛집').records[0].href,'/restaurants/a%2Fb');assert.ok(calls.filter(c=>c[0]==='owner').every(c=>c[1]==='author_id'||c[1]==='user_id'));assert.ok(calls.filter(c=>c[0]==='owner').every(c=>c[2]==='owner'));assert.ok(calls.filter(c=>c[0]==='limit').every(c=>c[1]===3));
});
