import 'server-only';
import { cache } from 'react';
import { getSupabaseServerSession } from '@/lib/supabase/session';
import { profilePhotoBucket, profilePhotoPath } from '@/lib/memberProfile';
// Per-request only: private profile data must never enter a shared cache.
export const getMemberProfile = cache(async () => {
  const {supabase,user} = await getSupabaseServerSession();
  if (!supabase || !user) return null;
  const {data,error} = await supabase.from('member_profiles').select('nickname,bio,avatar_path').eq('user_id',user.id).maybeSingle();
  if (error || !data) return null;
  let photoUrl: string | null = null;
  if (data.avatar_path === profilePhotoPath(user.id)) {
    const {data: photo} = await supabase.storage.from(profilePhotoBucket).createSignedUrl(data.avatar_path,300);
    photoUrl = photo?.signedUrl ?? null;
  }
  return {nickname:String(data.nickname),bio:String(data.bio || ''),hasPhoto:!!data.avatar_path,photoUrl};
});
export async function getMemberActivity() {
  const {supabase,user} = await getSupabaseServerSession();
  if (!supabase || !user) return [];
  const sources = [
    {table:'reviews',label:'콘텐츠',path:'/reviews',field:'title'},
    {table:'watchlist_items',label:'기대작',path:'/watchlist',field:'title'},
    {table:'merchandise_reviews',label:'상품',path:'/merchandise',field:'title'},
    {table:'restaurant_reviews',label:'맛집',path:'/restaurants',field:'title'},
    {table:'travel',label:'여행 기록',path:'/travel',field:'title'},
    {table:'drink_posts',label:'술',path:'/drinks',field:'name'},
  ];
  return Promise.all(sources.map(async source => {
    try {
      const {data,count,error} = await supabase.from(source.table).select(`id,${source.field},created_at`,{count:'exact'}).eq('author_id',user.id).order('created_at',{ascending:false}).order('id').limit(3);
      if (error) throw error;
      const rows = (data ?? []) as unknown as {id:string;title?:string;name?:string;created_at:string}[];
      return {label:source.label,count:count ?? null,records:rows.map(row=>({id:`${source.table}:${row.id}`,href:`${source.path}/${encodeURIComponent(row.id)}`,title:row.title || row.name || '제목 없는 기록',date:row.created_at,label:source.label}))};
    } catch { return {label:source.label,count:null,records:[]}; }
  }));
}
