-- Administrator status comes from the existing database rule, never user metadata.
create or replace function private.change_nickname(p_nickname text) returns void language plpgsql security definer set search_path='' as $$
declare member_id uuid:=auth.uid(); t text;
begin
  if not private.is_member() then raise exception 'not authorized' using errcode='42501'; end if;
  if p_nickname is null or p_nickname !~ '^[가-힣A-Za-z0-9_-]{2,16}$' or lower(p_nickname)='탈퇴한회원'
    or (lower(p_nickname) in ('admin','administrator','관리자','운영자') and not public.is_admin())
    then raise exception 'nickname not allowed' using errcode='22023'; end if;
  if exists(select 1 from public.member_profiles where user_id=member_id and nickname=p_nickname) then return; end if;
  if exists(select 1 from public.member_profiles where lower(nickname)=lower(p_nickname) and user_id<>member_id)
    then raise exception 'nickname unavailable' using errcode='23505'; end if;
  update public.member_profiles set nickname=p_nickname where user_id=member_id;
  if not found then raise exception 'profile missing'; end if;
  update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}')||jsonb_build_object('nickname',p_nickname,'display_name',p_nickname) where auth.users.id=member_id;
  foreach t in array array['reviews','watchlist_items','restaurant_reviews','travel','merchandise_reviews','drink_posts'] loop
    execute format('update public.%I set author_name=$1 where author_id=$2',t) using p_nickname,member_id;
  end loop;
end $$;
revoke all on function private.change_nickname(text) from public,anon;
grant execute on function private.change_nickname(text) to authenticated;
notify pgrst,'reload schema';
