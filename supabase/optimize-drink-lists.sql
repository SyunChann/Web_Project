-- Public list previews only. Uses the caller's existing RLS permissions.
create or replace function public.drink_list_page_v1(
  p_query text default '', p_category text default '', p_kind text default '',
  p_rating numeric default null, p_tag text default '', p_page integer default 1
) returns jsonb language sql stable security invoker set search_path='' as $$
  with matched as not materialized (
    select id,created_at from public.drink_posts
    where (coalesce(p_query,'')='' or strpos(lower(name),lower(left(p_query,80)))>0)
      and (coalesce(p_category,'')='' or category=p_category)
      and (coalesce(p_kind,'')='' or kind=p_kind)
      and (p_rating is null or rating>=p_rating)
      and (coalesce(p_tag,'')='' or p_tag=any(tags))
  ), page as (
    select d.id,d.name,d.category,d.kind,d.rating,left(d.body,180) as excerpt,
      d.images[1] as image,d.tags[1:3] as tags,d.author_name,d.created_at
    from public.drink_posts d join (
      select id from matched order by created_at desc,id
      limit 24 offset ((least(10000,greatest(1,coalesce(p_page,1)))-1)*24)
    ) ids using(id)
    order by d.created_at desc,d.id
  )
  select jsonb_build_object('total_count',(select count(*) from matched),
    'items',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id) from page),'[]'::jsonb));
$$;
revoke all on function public.drink_list_page_v1(text,text,text,numeric,text,integer) from public;
grant execute on function public.drink_list_page_v1(text,text,text,numeric,text,integer) to anon,authenticated,service_role;
notify pgrst,'reload schema';
