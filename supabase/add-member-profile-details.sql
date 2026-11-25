-- Optional private profile details; nickname still uses change_nickname_v1.
alter table public.member_profiles add column if not exists bio text not null default '';
alter table public.member_profiles add column if not exists avatar_path text;
alter table public.member_profiles add constraint member_profile_bio_length check (char_length(bio) <= 120);
alter table public.member_profiles add constraint member_profile_avatar_owner check (avatar_path is null or avatar_path = user_id::text || '/avatar.webp');
grant update (bio, avatar_path) on public.member_profiles to authenticated;
create policy "members update own optional profile" on public.member_profiles for update to authenticated
using (user_id=(select auth.uid()) and (select private.is_member()))
with check (user_id=(select auth.uid()) and (select private.is_member()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('profile-photos','profile-photos',false,262144,array['image/webp']);
-- The restrictive policy prevents unrelated permissive storage policies widening access.
create policy "profile photos owner boundary" on storage.objects as restrictive for all to authenticated
using (bucket_id <> 'profile-photos' or (name=(select auth.uid())::text || '/avatar.webp' and (select private.is_member())))
with check (bucket_id <> 'profile-photos' or (name=(select auth.uid())::text || '/avatar.webp' and (select private.is_member())));
create policy "members read own profile photo" on storage.objects for select to authenticated using (bucket_id='profile-photos' and name=(select auth.uid())::text || '/avatar.webp' and (select private.is_member()));
create policy "members insert own profile photo" on storage.objects for insert to authenticated with check (bucket_id='profile-photos' and name=(select auth.uid())::text || '/avatar.webp' and (select private.is_member()));
create policy "members replace own profile photo" on storage.objects for update to authenticated using (bucket_id='profile-photos' and name=(select auth.uid())::text || '/avatar.webp' and (select private.is_member())) with check (bucket_id='profile-photos' and name=(select auth.uid())::text || '/avatar.webp' and (select private.is_member()));
create policy "members delete own profile photo" on storage.objects for delete to authenticated using (bucket_id='profile-photos' and name=(select auth.uid())::text || '/avatar.webp' and (select private.is_member()));
