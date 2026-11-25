'use server';
import { revalidatePath, updateTag } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isProfileWebp, maxProfilePhotoBytes, profilePhotoBucket, profilePhotoPath, validProfileBio } from '@/lib/memberProfile';
async function session() {
  const supabase = await createSupabaseServerClient();
  const {data:{user}} = supabase ? await supabase.auth.getUser() : {data:{user:null}};
  if (!supabase || !user?.email_confirmed_at) throw Error('로그인 후 다시 시도해 주세요.');
  return {supabase,user};
}
function refreshProfile() { updateTag('author-photos'); revalidatePath('/account'); revalidatePath('/'); }
export async function saveProfileBio(form: FormData) {
  const {supabase,user} = await session();
  const bio = String(form.get('bio') ?? '').trim();
  if (!validProfileBio(bio)) return {error:'소개는 120자 이내로 입력해 주세요.'};
  const {data,error} = await supabase.from('member_profiles').update({bio}).eq('user_id',user.id).select('user_id').single();
  if (error || !data) return {error:'소개를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'};
  refreshProfile(); return {message:'소개를 저장했습니다.'};
}
export async function saveProfilePhoto(form: FormData) {
  const {supabase,user} = await session();
  const file = form.get('photo');
  if (!(file instanceof File) || file.type !== 'image/webp' || file.size===0 || file.size>maxProfilePhotoBytes) return {error:'사진을 다시 선택해 주세요. 프로필 사진은 256KB 이하 WebP로 저장됩니다.'};
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isProfileWebp(bytes)) return {error:'올바른 사진 파일을 선택해 주세요.'};
  const path = profilePhotoPath(user.id);
  const {error:uploadError} = await supabase.storage.from(profilePhotoBucket).upload(path,bytes,{contentType:'image/webp',upsert:true,cacheControl:'0'});
  if (uploadError) return {error:'사진을 업로드하지 못했습니다. 잠시 후 다시 시도해 주세요.'};
  const {data,error} = await supabase.from('member_profiles').update({avatar_path:path}).eq('user_id',user.id).select('user_id').single();
  if (error || !data) return {error:'사진 정보를 저장하지 못했습니다. 다시 시도해 주세요.'};
  refreshProfile(); return {message:'프로필 사진을 변경했습니다.'};
}
export async function removeProfilePhoto() {
  const {supabase,user} = await session();
  const {error:removeError} = await supabase.storage.from(profilePhotoBucket).remove([profilePhotoPath(user.id)]);
  if (removeError) return {error:'사진을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'};
  const {data,error} = await supabase.from('member_profiles').update({avatar_path:null}).eq('user_id',user.id).select('user_id').single();
  if (error || !data) return {error:'사진 정보를 갱신하지 못했습니다. 다시 시도해 주세요.'};
  refreshProfile(); return {message:'기본 프로필로 변경했습니다.'};
}
