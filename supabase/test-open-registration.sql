-- Runs entirely inside a rolled-back transaction. No email is sent.
begin;
do $$ declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
begin
  perform set_config('test.member_a',a::text,true);
  perform set_config('test.member_b',b::text,true);
  insert into auth.users(id,aud,role,email,raw_user_meta_data,email_confirmed_at)
  values(a,'authenticated','authenticated',a||'@example.invalid',jsonb_build_object('nickname','검증_'||left(a::text,8),'terms_version','2026-11-18','privacy_version','2026-11-18'),null),
    (b,'authenticated','authenticated',b||'@example.invalid',jsonb_build_object('nickname','검증_'||left(b::text,8),'terms_version','2026-11-18','privacy_version','2026-11-18'),now());
  if (select count(*) from public.member_profiles where user_id in(a,b))<>2 then raise exception 'missing profiles'; end if;
  begin
    insert into auth.users(id,raw_user_meta_data) values(gen_random_uuid(),jsonb_build_object('nickname','BadConsent'));
    raise exception 'missing consent accepted';
  exception when raise_exception then if sqlerrm='missing consent accepted' then raise; end if; end;
end $$;
set local role anon;
do $$ begin
  if not public.nickname_available_v1('새이름_테스트') then raise exception 'availability failed'; end if;
  begin perform count(*) from public.member_profiles; raise exception 'profile exposed'; exception when insufficient_privilege then null; end;
  begin perform public.close_member_account_v1(current_setting('test.member_a')::uuid); raise exception 'delete exposed'; exception when insufficient_privilege then null; end;
  begin perform public.validate_invite_code('TEST'); raise exception 'invites still enabled'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.member_a'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  if private.is_member() then raise exception 'unconfirmed accepted'; end if;
  begin insert into public.drink_posts(name,category,kind,body,author_id) values('test','whisky','curious','test',auth.uid()); raise exception 'unconfirmed write accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update auth.users set email_confirmed_at=now() where id=current_setting('test.member_a')::uuid;
set local role authenticated;
do $$ begin
  if not private.is_member() then raise exception 'confirmed member denied'; end if;
  if (select count(*) from public.member_profiles)<>1 then raise exception 'other profile exposed'; end if;
  insert into public.drink_posts(name,category,kind,body,author_id,author_name) values('test','whisky','curious','test',auth.uid(),'spoofed');
  if exists(select 1 from public.drink_posts where author_id=auth.uid() and author_name='spoofed') then raise exception 'author spoof accepted'; end if;
  begin insert into public.drink_posts(name,category,kind,body,author_id) values('test','whisky','curious','test',current_setting('test.member_b')::uuid); raise exception 'foreign author accepted'; exception when insufficient_privilege then null; end;
  perform public.change_nickname_v1('변경_'||left(auth.uid()::text,8));
  if exists(select 1 from public.drink_posts where author_id=auth.uid() and author_name<>'변경_'||left(auth.uid()::text,8)) then raise exception 'author name not synced'; end if;
  begin perform public.close_member_account_v1(auth.uid()); raise exception 'member could call admin delete'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if public.nickname_available_v1('변경_'||left(current_setting('test.member_a'),8)) then raise exception 'duplicate accepted'; end if;
  if exists(select 1 from pg_policies where schemaname in ('public','storage') and (coalesce(qual,'')||coalesce(with_check,'')) like '%is_invited_user%') then raise exception 'invite policies remain'; end if;
end $$;
-- Test deletion as the server role, retaining anonymized public content.
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select public.close_member_account_v1(current_setting('test.member_a')::uuid);
reset role;
do $$ begin
  if exists(select 1 from auth.users where id=current_setting('test.member_a')::uuid) then raise exception 'account remains'; end if;
  if exists(select 1 from public.member_profiles where user_id=current_setting('test.member_a')::uuid) then raise exception 'profile remains'; end if;
  if not exists(select 1 from public.drink_posts where name='test' and author_id is null and author_name='탈퇴한 회원') then raise exception 'public post lost'; end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.member_a'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin if private.is_member() then raise exception 'deleted account token still authorized'; end if; end $$;
reset role;
rollback;
select 'PASS: consent, profiles, nickname uniqueness, email confirmation, ownership, canonical authors, invitation retirement and withdrawal' as result;
