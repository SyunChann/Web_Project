-- Preserve the existing (admin OR owner) logic and restrictive membership policies.
set lock_timeout = '3s';
do $$
declare t text; label text; command text; combined text; predicate text; old_admin text; old_author text;
begin
  for t,label in select * from (values ('reviews','reviews'),('watchlist_items','watchlist items'),('merchandise_reviews','merchandise reviews'),('restaurant_reviews','restaurant reviews'),('travel','travel')) v(t,label) loop
    predicate := '(select public.is_admin()) OR ((select private.is_member()) AND author_id = (select auth.uid()))';
    foreach command in array array['INSERT','UPDATE','DELETE'] loop
      combined := 'members may ' || lower(command) || ' ' || label;
      old_admin := 'admin can ' || lower(command) || ' ' || label;
      old_author := case when command='INSERT' then 'verified members can insert ' else 'authors can ' || lower(command) || ' own ' end || label;
      if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname=combined) then
        if (select count(*) from pg_policies where schemaname='public' and tablename=t and policyname in (old_admin,old_author) and permissive='PERMISSIVE' and roles=array['authenticated']::name[]) <> 2 then
          raise exception 'Unexpected policy configuration for % %',t,command;
        end if;
        execute format('create policy %I on public.%I for %s to authenticated %s %s', combined,t,command,
          case when command='INSERT' then '' else 'using ('||predicate||')' end,
          case when command='DELETE' then '' else 'with check ('||predicate||')' end);
        execute format('drop policy %I on public.%I',old_admin,t);
        execute format('drop policy %I on public.%I',old_author,t);
      end if;
    end loop;
    execute format('create index if not exists %I on public.%I(author_id)', t||'_author_id_idx',t);
  end loop;
end $$;

-- Keep the bucket public for existing image URLs; disallow new SVG uploads.
update storage.buckets set allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'],file_size_limit=5242880 where id='review-thumbnails';
-- New and legacy server uploads now use the authenticated user's directory.
alter policy "verified members can upload review thumbnails" on storage.objects
  with check (bucket_id='review-thumbnails' and (select private.is_member()) and (storage.foldername(name))[1]=(select auth.uid())::text);
reset lock_timeout;
