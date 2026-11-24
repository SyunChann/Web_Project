-- Temporary accounts and copied public rows exist only inside this rolled-back transaction.
begin;
create temporary table audit_templates(table_name text primary key,payload jsonb);
grant select on audit_templates to anon,authenticated;
do $$ declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); t text; template jsonb; prefix text:='audit-'||gen_random_uuid()::text;
begin
  perform set_config('audit.a',a::text,true); perform set_config('audit.b',b::text,true); perform set_config('audit.c',c::text,true); perform set_config('audit.prefix',prefix,true);
  insert into auth.users(id,aud,role,email,raw_user_meta_data,email_confirmed_at)
  select u,'authenticated','authenticated',u||'@example.invalid',jsonb_build_object('nickname','검증_'||left(u::text,8),'terms_version','2026-11-18','privacy_version','2026-11-18'),case when u=c then null else now() end from unnest(array[a,b,c]) u;
  foreach t in array array['reviews','watchlist_items','merchandise_reviews','restaurant_reviews','travel'] loop
    execute format('select to_jsonb(x) from public.%I x limit 1',t) into template;
    if template is null then raise exception 'A public template is required for %',t; end if;
    insert into audit_templates values(t,template);
    template:=template||jsonb_build_object('id',prefix||'-'||t,'author_id',a,'author_name','검증');
    execute format('insert into public.%I select (jsonb_populate_record(null::public.%I,$1)).*',t,t) using template;
  end loop;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('audit.a'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare t text; affected integer; template jsonb; check_sql text; allowed boolean;
begin
  select with_check into check_sql from pg_policies where schemaname='storage' and tablename='objects' and policyname='verified members can upload review thumbnails';
  execute 'select ('||check_sql||') from (select $1::text as bucket_id,$2::text as name) f' into allowed using 'review-thumbnails',auth.uid()::text||'/test.png';
  if not allowed then raise exception 'Own thumbnail upload denied'; end if;
  execute 'select ('||check_sql||') from (select $1::text as bucket_id,$2::text as name) f' into allowed using 'review-thumbnails',current_setting('audit.b')||'/test.png';
  if allowed then raise exception 'Foreign thumbnail directory allowed'; end if;
  foreach t in array array['reviews','watchlist_items','merchandise_reviews','restaurant_reviews','travel'] loop
    execute format('update public.%I set title=title where id=$1',t) using current_setting('audit.prefix')||'-'||t; get diagnostics affected=row_count;
    if affected<>1 then raise exception 'Owner update denied: %',t; end if;
    begin
      execute format('update public.%I set author_id=$1 where id=$2',t) using current_setting('audit.b')::uuid,current_setting('audit.prefix')||'-'||t;
      raise exception 'Owner reassignment accepted: %',t;
    exception when insufficient_privilege then null; end;
    select payload||jsonb_build_object('id',current_setting('audit.prefix')||'-new-'||t,'author_id',current_setting('audit.a'),'author_name','spoofed') into template from audit_templates where table_name=t;
    execute format('insert into public.%I select (jsonb_populate_record(null::public.%I,$1)).*',t,t) using template;
    execute format('delete from public.%I where id=$1',t) using current_setting('audit.prefix')||'-new-'||t; get diagnostics affected=row_count;
    if affected<>1 then raise exception 'Owner delete denied: %',t; end if;
  end loop;
end $$;
reset role;
-- Another confirmed member must not modify the owner's rows.
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('audit.b'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare t text; affected integer; template jsonb;
begin
  foreach t in array array['reviews','watchlist_items','merchandise_reviews','restaurant_reviews','travel'] loop
    execute format('update public.%I set title=title where id=$1',t) using current_setting('audit.prefix')||'-'||t; get diagnostics affected=row_count;
    if affected<>0 then raise exception 'Foreign update accepted: %',t; end if;
    execute format('delete from public.%I where id=$1',t) using current_setting('audit.prefix')||'-'||t; get diagnostics affected=row_count;
    if affected<>0 then raise exception 'Foreign delete accepted: %',t; end if;
    select payload||jsonb_build_object('id',current_setting('audit.prefix')||'-spoof-'||t,'author_id',current_setting('audit.a')) into template from audit_templates where table_name=t;
    begin
      execute format('insert into public.%I select (jsonb_populate_record(null::public.%I,$1)).*',t,t) using template;
      raise exception 'Foreign insert accepted: %',t;
    exception when insufficient_privilege then null; end;
  end loop;
end $$;
reset role;
-- An unconfirmed account cannot insert, even when claiming ownership.
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('audit.c'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare t text; template jsonb;
begin
  foreach t in array array['reviews','watchlist_items','merchandise_reviews','restaurant_reviews','travel'] loop
    select payload||jsonb_build_object('id',current_setting('audit.prefix')||'-unverified-'||t,'author_id',current_setting('audit.c')) into template from audit_templates where table_name=t;
    begin
      execute format('insert into public.%I select (jsonb_populate_record(null::public.%I,$1)).*',t,t) using template;
      raise exception 'Unconfirmed insert accepted: %',t;
    exception when insufficient_privilege then null; end;
  end loop;
end $$;
reset role;
-- Select an existing administrator internally without exposing their identity.
do $$ declare u record; found boolean:=false;
begin
  for u in select id,email from auth.users where email_confirmed_at is not null and deleted_at is null loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',u.id,'email',u.email,'role','authenticated')::text,true);
    if public.is_admin() then found:=true; exit; end if;
  end loop;
  if not found then raise exception 'Administrator fixture required'; end if;
end $$;
set local role authenticated;
do $$ declare t text; affected integer;
begin
  foreach t in array array['reviews','watchlist_items','merchandise_reviews','restaurant_reviews','travel'] loop
    execute format('update public.%I set title=title where id=$1',t) using current_setting('audit.prefix')||'-'||t; get diagnostics affected=row_count;
    if affected<>1 then raise exception 'Administrator access lost: %',t; end if;
  end loop;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ declare t text; affected integer;
begin
  foreach t in array array['reviews','watchlist_items','merchandise_reviews','restaurant_reviews','travel'] loop
    execute format('select count(*) from public.%I where id=$1',t) into affected using current_setting('audit.prefix')||'-'||t;
    if affected<>1 then raise exception 'Public read lost: %',t; end if;
    begin
      execute format('delete from public.%I where id=$1',t) using current_setting('audit.prefix')||'-'||t; get diagnostics affected=row_count;
      if affected<>0 then raise exception 'Anonymous deletion accepted: %',t; end if;
    exception when insufficient_privilege then null; end;
  end loop;
end $$;
reset role;
rollback;
select 'PASS: five content tables preserve owner writes, foreign-owner rejection, unconfirmed rejection, administrator access and public reads' as result;
