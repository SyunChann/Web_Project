-- Roll back every account/profile/post change made by this test.
begin;
do $$ declare member_id uuid:=gen_random_uuid(); admin_id uuid; operator_name text;
begin
  select id into admin_id from auth.users where lower(email)='admin@example.com' and email_confirmed_at is not null and deleted_at is null;
  if admin_id is null then raise exception 'confirmed administrator fixture required'; end if;
  select name into operator_name from (values ('administrator'),('운영자'),('관리자'),('admin')) names(name)
    where not exists(select 1 from public.member_profiles where lower(nickname)=names.name) limit 1;
  if operator_name is null then raise exception 'unused operator name required'; end if;
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
    values(member_id,member_id||'@example.invalid',now(),jsonb_build_object('nickname','회원_'||left(member_id::text,8),'terms_version','2026-11-18','privacy_version','2026-11-18','is_admin',true));
  perform set_config('test.operator_member',member_id::text,true);
  perform set_config('test.operator_admin',admin_id::text,true);
  perform set_config('test.operator_name',operator_name,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'email',member_id||'@example.invalid','role','authenticated','user_metadata',jsonb_build_object('is_admin',true))::text,true);
end $$;
set local role authenticated;
do $$ declare n text;
begin
  foreach n in array array['관리자','운영자','ADMIN','administrator'] loop
    begin perform public.change_nickname_v1(n); raise exception 'member claimed operator name'; exception when invalid_parameter_value then null; end;
    if public.nickname_available_v1(n) then raise exception 'signup accepted operator name'; end if;
  end loop;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.operator_admin'),'email','admin@example.com','role','authenticated')::text,true);
set local role authenticated;
do $$ declare n text:=current_setting('test.operator_name'); other_name text;
begin
  if not public.is_admin() then raise exception 'administrator not recognized'; end if;
  perform public.change_nickname_v1(n);
  perform public.change_nickname_v1(n);
  perform public.change_nickname_v1(upper(n));
  if not exists(select 1 from public.member_profiles where user_id=auth.uid() and nickname=upper(n)) then raise exception 'admin nickname was not changed'; end if;
  begin perform public.change_nickname_v1('탈퇴한회원'); raise exception 'deleted name accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.change_nickname_v1('<관리자>'); raise exception 'invalid format accepted'; exception when invalid_parameter_value then null; end;
  other_name:='회원_'||left(current_setting('test.operator_member'),8);
  begin perform public.change_nickname_v1(other_name); raise exception 'duplicate accepted'; exception when unique_violation then null; end;
end $$;
reset role;
rollback;
select 'PASS: administrator exception, member/metadata spoof rejection, signup reservation, uniqueness, format and same-name updates' as result;
