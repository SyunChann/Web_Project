-- Transactional RLS checks. No real profile changes are retained.
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email_confirmed_at is not null and deleted_at is null and not coalesce(is_anonymous,false) and (banned_until is null or banned_until < now()) order by created_at limit 1),true);
set local role authenticated;
do $$
declare changed integer;
begin
  if auth.uid() is null then raise exception 'No confirmed member available for test'; end if;
  update public.member_profiles set bio=bio where user_id=auth.uid();
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Own profile update was denied'; end if;
  update public.member_profiles set bio=bio where user_id<>auth.uid();
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Another member profile was writable'; end if;
  begin
    update public.member_profiles set nickname=nickname where user_id=auth.uid();
    raise exception 'Nickname bypass was allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.member_profiles set bio=repeat('a',121) where user_id=auth.uid();
    raise exception 'Oversized bio accepted';
  exception when check_violation then null; end;
  begin
    update public.member_profiles set avatar_path='someone-else/avatar.webp' where user_id=auth.uid();
    raise exception 'Foreign avatar accepted';
  exception when check_violation then null; end;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from storage.buckets where id='profile-photos' and not public and file_size_limit=262144 and allowed_mime_types=array['image/webp']) then raise exception 'Private bucket restrictions missing'; end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile photos owner boundary' and permissive='RESTRICTIVE') then raise exception 'Storage owner boundary missing'; end if;
  if has_column_privilege('anon','public.member_profiles','bio','SELECT') or has_column_privilege('anon','public.member_profiles','bio','UPDATE') then raise exception 'Anonymous profile access'; end if;
end $$;
rollback;
select 'profile ownership, field privileges, length, path and private bucket checks passed' as result;
