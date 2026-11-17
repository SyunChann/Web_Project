-- Supabase SQL Editor에서 한 번 실행합니다. 기존 콘텐츠 테이블과 정책은 변경하지 않습니다.
begin;
create table if not exists public.drink_posts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  category text not null check (category in ('whisky','sake','traditional','beer','other')),
  kind text not null check (kind in ('review','curious')),
  rating numeric(2,1),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  methods text[] not null default '{}',
  tags text[] not null default '{}',
  images text[] not null default '{}' check (cardinality(images) <= 5),
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default '술 친구',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'review' and rating is not null and rating between 0.5 and 5 and rating * 2 = trunc(rating * 2))
    or (kind = 'curious' and rating is null and cardinality(methods) = 0 and cardinality(tags) = 0)),
  check (methods <@ array['스트레이트','온더록','하이볼','물 타서','차갑게','상온','따뜻하게','기타']::text[]),
  check (tags <@ array['달콤함','드라이함','과일향','꽃향','곡물향','견과류','바닐라','스모키','오크향','산뜻함','묵직함','깔끔함','부드러움','산미','긴 여운']::text[])
);
create index if not exists drink_posts_created_idx on public.drink_posts (created_at desc, id);
create index if not exists drink_posts_filter_idx on public.drink_posts (category, kind, created_at desc);
create index if not exists drink_posts_author_idx on public.drink_posts (author_id);
create or replace function public.drink_images_owned(paths text[], owner_id uuid)
returns boolean language sql immutable strict set search_path = '' as $$
  select not exists (select 1 from unnest(paths) as path
    where path is null or path !~ ('^' || owner_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp|gif)$'));
$$;
alter table public.drink_posts enable row level security;
revoke all on public.drink_posts from anon, authenticated;
grant select on public.drink_posts to anon, authenticated;
grant insert, update, delete on public.drink_posts to authenticated;
drop policy if exists "drinks public read" on public.drink_posts;
create policy "drinks public read" on public.drink_posts for select using (true);
drop policy if exists "drinks author insert" on public.drink_posts;
create policy "drinks author insert" on public.drink_posts for insert to authenticated
  with check (author_id = (select auth.uid()) and public.drink_images_owned(images, (select auth.uid())));
drop policy if exists "drinks author update" on public.drink_posts;
create policy "drinks author update" on public.drink_posts for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()) and public.drink_images_owned(images, (select auth.uid())));
drop policy if exists "drinks author delete" on public.drink_posts;
create policy "drinks author delete" on public.drink_posts for delete to authenticated using (author_id = (select auth.uid()));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('drink-photos','drink-photos',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "drink photos public read" on storage.objects;
create policy "drink photos public read" on storage.objects for select using (bucket_id = 'drink-photos');
drop policy if exists "drink photos author insert" on storage.objects;
create policy "drink photos author insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'drink-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "drink photos author delete" on storage.objects;
create policy "drink photos author delete" on storage.objects for delete to authenticated
  using (bucket_id = 'drink-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
