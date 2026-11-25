import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function harness(failedTable) {
  const queries=[], caches=[];
  const client={from(table){const request={table};queries.push(request);const q={select(fields){request.fields=fields;return q;},order(){return q;},async limit(limit){request.limit=limit;if(table===failedTable)throw Error("private upstream error");return {data:[{id:"a/b",title:"실제 기록",name:"신도",type:"anime",created_at:table==='drink_posts'?'2026-11-25T10:00:00Z':'2026-11-20T01:00:00Z',rating:3,category:"whisky",kind:"curious",images:["owner/photo.webp"]}]};}};return q;}};
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/data/homeFeed.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,Date,require:name=>({
    'server-only':{},'next/cache':{unstable_cache:(fn,key,options)=>{caches.push({key,options});return fn;}},
    '@/lib/supabase/public':{createSupabasePublicClient:()=>client},'@/lib/supabase/config':{supabaseUrl:'https://fixture.supabase.co'},
    '@/lib/drinks':{drinkCategories:{whisky:'위스키'}},'@/data/travel':{getTravelPostsPage:async()=>({items:[{travel:{id:'trip',tripTitle:'여행 묶음',title:'개별 장소',createdAt:'2026-11-21T00:00:00Z',thumbnail:null}}],error:null})},
  })[name]??(()=>{throw Error(name)})()});
  return {model:exports,queries,caches};
}
test('home feed bounds source reads, preserves cache tags and uses grouped itinerary titles',async()=>{
 const h=harness();const result=await h.model.getHomeFeed();assert.equal(result.partial,false);assert.equal(result.entries.length,6);assert.equal(h.queries.length,5);
 for(const q of h.queries){assert.equal(q.limit,3);assert.ok(!q.fields.includes('*'));assert.ok(!q.fields.includes('summary'));assert.ok(!q.fields.includes('body'));assert.ok(!q.fields.includes('author_id'));}
 assert.equal(result.entries[0].group,'drinks');assert.equal(result.entries[0].rating,null);assert.equal(result.entries.find(x=>x.group==='travel').title,'여행 묶음');assert.equal(result.entries.find(x=>x.id==='reviews:a/b').href,'/reviews/a%2Fb');
 assert.deepEqual(h.caches.flatMap(x=>Array.from(x.options.tags)).sort(),['drinks','merchandise-reviews','restaurants','reviews','travel','watchlist']);assert.ok(h.caches.every(x=>x.options.revalidate===60));
});
test('a home source failure preserves other entries and reports partial data',async()=>{const h=harness('drink_posts');const result=await h.model.getHomeFeed();assert.equal(result.partial,true);assert.equal(result.entries.length,5);assert.ok(!result.entries.some(x=>x.group==='drinks'));});
test('home thumbnails allow public assets and reject unapproved hosts, credentials and Maps API calls',()=>{
 const {homeThumbnail}=harness().model;assert.equal(homeThumbnail('/thumbnails/frieren.svg'),'/thumbnails/frieren.svg');const image='https://fixture.supabase.co/storage/v1/object/public/review-thumbnails/owner/a.webp';assert.equal(homeThumbnail(image),image);
 for(const value of ['//evil.test/a.png','/api/account/nickname','/thumbnails/\\evil','https://evil.test/a.png','https://maps.googleapis.com/maps/api/place/photo?key=private','https://user:pass@fixture.supabase.co/storage/v1/object/public/a.png','https://fixture.supabase.co:8443/storage/v1/object/public/a.png','javascript:alert(1)'])assert.equal(homeThumbnail(value),null,value);
});
test('home account controls retain login return, member account and administrator visibility',async()=>{
 const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');const jsx=await import('react/jsx-runtime');const icons=await import('lucide-react');
 for(const scenario of ['guest','member','admin','unavailable']){
  const user=scenario==='guest'?null:{id:'owner',email:scenario==='admin'?'admin@example.test':'member@example.test'};
  const exports={};const modules={
   react:React,'react/jsx-runtime':jsx,'lucide-react':icons,'next/link':{default:({children,href})=>React.createElement('a',{href},children)},
   '@/lib/supabase/session':{getSupabaseServerSession:async()=>{if(scenario==='unavailable')throw Error('offline');return {user};}},
   '@/lib/admin':{isAdminUser:u=>u?.email==='admin@example.test'},'@/lib/returnTo':{loginHref:path=>'/login?'+new URLSearchParams({next:path})},
   '@/components/site/SiteNavigation':{SiteNavigationLinks:()=>null,SiteMobileMenu:()=>null,SiteBottomNavigation:()=>null,SidebarToggle:()=>null},
   '@/data/memberProfile':{getMemberProfile:async()=>null},'@/components/account/ProfileAvatar':{ProfileAvatar:()=>React.createElement('span',null,'사진')},
   '@/components/ThemeToggle':{ThemeToggle:()=>React.createElement('button',null,'테마')},'@/components/LogoutButton':{LogoutButton:()=>React.createElement('button',null,'로그아웃')},
   './Home.module.css':{default:new Proxy({},{get:(_target,key)=>String(key)})},
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/home/HomeNavigation.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>{if(!(name in modules))throw Error(name);return modules[name];}});
  const html=renderToStaticMarkup(await exports.HomeAccount());
  if(scenario==='guest'||scenario==='unavailable'){assert.match(html,/href="\/login\?next=%2Fnew"/);assert.ok(!html.includes('href="/admin"'));}
  else{assert.match(html,/href="\/new"/);assert.match(html,/href="\/account"/);assert.match(html,/로그아웃/);assert.equal(html.includes('href="/admin"'),scenario==='admin');}
 }
});
