import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { profilePhotoBucket, profilePhotoPath } from '@/lib/memberProfile';
export function authorPhotoLookup(id:string|null,nickname:string|null) {
  if(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return {column:'user_id',value:id};
  if(!id && nickname && /^[가-힣A-Za-z0-9_-]{2,16}$/.test(nickname) && nickname!=='탈퇴한회원')return {column:'nickname',value:nickname};
  return null;
}
function photoClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  return {url,client:createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.timeout(5000)})}})};
}
// Cache only the photo path. Signed URLs must be fresh even after a long idle period.
const readAuthorPhotoPath = unstable_cache(async(column:'user_id'|'nickname',value:string)=>{
  const connection=photoClient();if(!connection)return null;
  const {data,error}=await connection.client.from('member_profiles').select('user_id,avatar_path').eq(column,value).maybeSingle();
  if(error)throw Error('author photo unavailable');
  return data && data.avatar_path===profilePhotoPath(data.user_id)?String(data.avatar_path):null;
},['public-author-photo-path-v1'],{revalidate:60,tags:['author-photos']});
// This public projection returns a photo only. Never return email or bio.
export async function getAuthorPhoto(column:'user_id'|'nickname',value:string){
  const path=await readAuthorPhotoPath(column,value);if(!path)return null;
  const connection=photoClient();if(!connection)return null;
  const {data:photo,error}=await connection.client.storage.from(profilePhotoBucket).createSignedUrl(path,300);
  if(error)throw Error('author photo unavailable');
  if(!photo?.signedUrl)return null;
  const signed=new URL(photo.signedUrl);
  if(signed.origin!==new URL(connection.url).origin || !signed.pathname.startsWith('/storage/v1/object/sign/profile-photos/'))return null;
  return signed.href;
}
