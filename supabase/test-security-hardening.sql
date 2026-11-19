-- JWT 클레임을 SQL 세션 안에서만 설정하며 실제 계정·게시글은 변경하지 않습니다.
begin;
do $$
begin
  if exists (select 1 from pg_proc where oid = 'public.is_admin()'::regprocedure
    and (prosecdef or not ('search_path=""' = any(proconfig)))) then
    raise exception 'is_admin must use invoker rights and an empty search_path';
  end if;
  if to_regprocedure('public.prevent_multiple_active_omok_rooms()') is not null then
    raise exception 'retired trigger function remains';
  end if;
  if to_regclass('public.omok_rooms') is not null then
    if has_table_privilege('anon','public.omok_rooms','select')
      or has_table_privilege('authenticated','public.omok_rooms','select') then
      raise exception 'retired game data remains accessible';
    end if;
  end if;
end $$;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$ begin
  if public.is_admin() then raise exception 'anonymous user became admin'; end if;
  perform id from public.reviews limit 1;
end $$;
reset role;

select set_config('request.jwt.claims', '{"role":"authenticated","email":"security-check@example.invalid","user_metadata":{"is_admin":true}}', true);
set local role authenticated;
do $$ begin
  if public.is_admin() then raise exception 'user metadata granted administrator privileges'; end if;
  perform id from public.reviews limit 1;
end $$;
reset role;

-- 운영자 이메일을 출력하거나 파일에 기록하지 않고 기존 운영자 판정을 확인합니다.
do $$
declare candidate record; found_admin boolean := false;
begin
  for candidate in select id,email from auth.users
    where deleted_at is null and email_confirmed_at is not null loop
    perform set_config('request.jwt.claims',jsonb_build_object(
      'sub',candidate.id,'email',candidate.email,'role','authenticated')::text,true);
    if public.is_admin() then found_admin := true; exit; end if;
  end loop;
  if not found_admin then raise exception 'confirmed administrator fixture required'; end if;
end $$;
set local role authenticated;
do $$ begin
  if not public.is_admin() then raise exception 'administrator lost access'; end if;
end $$;
reset role;
rollback;
select 'PASS: anonymous/member rejection, administrator access, public reads and retired game isolation' as result;
