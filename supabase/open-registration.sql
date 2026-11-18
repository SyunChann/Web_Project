-- Existing users/posts are retained. Run after schema.sql and feature SQL.
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to anon,authenticated,service_role;

create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (nickname ~ '^[가-힣A-Za-z0-9_-]{2,16}$'),
  terms_version text,
  privacy_version text,
  consented_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists member_profiles_nickname_unique on public.member_profiles(lower(nickname));
alter table public.member_profiles enable row level security;
revoke all on public.member_profiles from public,anon,authenticated;
grant select on public.member_profiles to authenticated;
create policy "members read own profile" on public.member_profiles for select to authenticated using (user_id=(select auth.uid()));

-- Live Auth data prevents deleted, banned, unconfirmed and anonymous users from writing.
create or replace function private.is_member() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from auth.users u where u.id=auth.uid()
    and u.email_confirmed_at is not null and u.deleted_at is null and not coalesce(u.is_anonymous,false)
    and (u.banned_until is null or u.banned_until < now()));
$$;
revoke all on function private.is_member() from public,anon;
grant execute on function private.is_member() to authenticated;

create or replace function private.nickname_available(p_nickname text) returns boolean
language sql stable security definer set search_path='' as $$
  select p_nickname ~ '^[가-힣A-Za-z0-9_-]{2,16}$'
    and lower(p_nickname) not in ('admin','administrator','관리자','운영자','탈퇴한회원')
    and not exists(select 1 from public.member_profiles where lower(nickname)=lower(p_nickname));
$$;
revoke all on function private.nickname_available(text) from public;
grant execute on function private.nickname_available(text) to anon,authenticated;
create or replace function public.nickname_available_v1(p_nickname text) returns boolean language sql stable security invoker set search_path='' as $$
  select private.nickname_available(p_nickname);
$$;
revoke all on function public.nickname_available_v1(text) from public;
grant execute on function public.nickname_available_v1(text) to anon,authenticated;

-- Preserve usable names; resolve pre-existing duplicates without losing accounts.
do $$ declare u record; n text; base text; suffix integer;
begin
  for u in select id,raw_user_meta_data from auth.users order by created_at,id loop
    if exists(select 1 from public.member_profiles where user_id=u.id) then continue; end if;
    base:=left(regexp_replace(coalesce(nullif(u.raw_user_meta_data->>'display_name',''),u.raw_user_meta_data->>'name','회원'),'[^가-힣A-Za-z0-9_-]','','g'),16);
    if length(base)<2 then base:='회원'; end if;
    n:=base; suffix:=0;
    while exists(select 1 from public.member_profiles where lower(nickname)=lower(n)) loop
      suffix:=suffix+1; n:=left(base,10)||'_'||suffix::text;
    end loop;
    insert into public.member_profiles(user_id,nickname) values(u.id,n);
    update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}')||jsonb_build_object('nickname',n,'display_name',n)-'pending_invite_code' where id=u.id;
  end loop;
end $$;

create or replace function private.on_member_signup() returns trigger language plpgsql security definer set search_path='' as $$
declare n text:=btrim(new.raw_user_meta_data->>'nickname');
begin
  if n is null or not public.nickname_available_v1(n) then raise exception 'nickname unavailable'; end if;
  if new.raw_user_meta_data->>'terms_version' is distinct from '2026-11-18' or new.raw_user_meta_data->>'privacy_version' is distinct from '2026-11-18' then raise exception 'consent required'; end if;
  insert into public.member_profiles(user_id,nickname,terms_version,privacy_version,consented_at)
    values(new.id,n,'2026-11-18','2026-11-18',now());
  return new;
end $$;
revoke all on function private.on_member_signup() from public,anon,authenticated;
create trigger on_member_signup after insert on auth.users for each row execute function private.on_member_signup();

create or replace function private.change_nickname(p_nickname text) returns void language plpgsql security definer set search_path='' as $$
declare member_id uuid:=auth.uid(); t text;
begin
  if not private.is_member() then raise exception 'not authorized' using errcode='42501'; end if;
  if exists(select 1 from public.member_profiles where user_id=member_id and nickname=p_nickname) then return; end if;
  if not public.nickname_available_v1(p_nickname) then raise exception 'nickname unavailable' using errcode='23505'; end if;
  update public.member_profiles set nickname=p_nickname where user_id=member_id;
  if not found then raise exception 'profile missing'; end if;
  update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}')||jsonb_build_object('nickname',p_nickname,'display_name',p_nickname) where auth.users.id=member_id;
  foreach t in array array['reviews','watchlist_items','restaurant_reviews','travel','merchandise_reviews','drink_posts'] loop
    execute format('update public.%I set author_name=$1 where author_id=$2',t) using p_nickname,member_id;
  end loop;
end $$;
revoke all on function private.change_nickname(text) from public,anon;
grant execute on function private.change_nickname(text) to authenticated;
create or replace function public.change_nickname_v1(p_nickname text) returns void language sql security invoker set search_path='' as $$
  select private.change_nickname(p_nickname);
$$;
revoke all on function public.change_nickname_v1(text) from public,anon;
grant execute on function public.change_nickname_v1(text) to authenticated;

-- Keep canonical author names even if someone edits their Auth metadata directly.
create or replace function private.canonical_author() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is not null and new.author_id=auth.uid() then
    select nickname into new.author_name from public.member_profiles where user_id=auth.uid();
    if new.author_name is null then raise exception 'profile missing'; end if;
  end if;
  return new;
end $$;
revoke all on function private.canonical_author() from public,anon,authenticated;
do $$ declare p record; t text; roles text;
begin
  -- Replace only the invitation predicate, retaining ownership and administrator rules.
  for p in select * from pg_policies where schemaname in ('public','storage') and (coalesce(qual,'') like '%is_invited_user()%' or coalesce(with_check,'') like '%is_invited_user()%') loop
    select string_agg(quote_ident(r),',') into roles from unnest(p.roles) r;
    execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
    execute format('create policy %I on %I.%I as %s for %s to %s%s%s',replace(p.policyname,'invited users','verified members'),p.schemaname,p.tablename,p.permissive,p.cmd,roles,
      case when p.qual is null then '' else ' using ('||replace(p.qual,'is_invited_user()','private.is_member()')||')' end,
      case when p.with_check is null then '' else ' with check ('||replace(p.with_check,'is_invited_user()','private.is_member()')||')' end);
  end loop;
  foreach t in array array['reviews','watchlist_items','restaurant_reviews','travel','merchandise_reviews','drink_posts'] loop
    execute format('create trigger canonical_member_author before insert or update on public.%I for each row execute function private.canonical_author()',t);
  end loop;
end $$;
-- Restrictive policies also cover pre-existing permissive administrator/author policies.
do $$ declare t text; command text;
begin
  foreach t in array array['reviews','watchlist_items','restaurant_reviews','travel','merchandise_reviews','drink_posts','price_watchlists','price_history'] loop
    foreach command in array array['insert','update','delete'] loop
      execute format('create policy %I on public.%I as restrictive for %s to authenticated %s', 'verified member '||command,t,command,
        case when command='insert' then 'with check ((select private.is_member()))' when command='update' then 'using ((select private.is_member())) with check ((select private.is_member()))' else 'using ((select private.is_member()))' end);
    end loop;
  end loop;
end $$;
create policy "verified member storage insert" on storage.objects as restrictive for insert to authenticated with check ((select private.is_member()));
create policy "verified member storage update" on storage.objects as restrictive for update to authenticated using ((select private.is_member())) with check ((select private.is_member()));
create policy "verified member storage delete" on storage.objects as restrictive for delete to authenticated using ((select private.is_member()));

-- Retain invitation audit history, but disable all existing links and write paths.
update public.invite_codes set revoked_at=coalesce(revoked_at,now());
revoke all on public.invite_codes,public.invite_code_uses from anon,authenticated;
revoke all on function public.validate_invite_code(text),public.claim_invite_code(text),public.is_invited_user() from public,anon,authenticated;

-- Called only by the server after password confirmation and Storage cleanup.
create or replace function public.close_member_account_v1(p_user_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare t text;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  foreach t in array array['reviews','watchlist_items','restaurant_reviews','travel','merchandise_reviews','drink_posts'] loop
    execute format('update public.%I set author_name=$1,author_id=null where author_id=$2',t) using '탈퇴한 회원',p_user_id;
  end loop;
  delete from auth.users where id=p_user_id;
end $$;
revoke all on function public.close_member_account_v1(uuid) from public,anon,authenticated;
grant execute on function public.close_member_account_v1(uuid) to service_role;
notify pgrst,'reload schema';
