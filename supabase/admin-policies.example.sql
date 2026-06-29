-- Replace the email below with the administrator email created in Supabase Auth.

drop policy if exists "admin can insert reviews" on public.reviews;
drop policy if exists "admin can update reviews" on public.reviews;
drop policy if exists "admin can delete reviews" on public.reviews;
drop policy if exists "admin can upload review thumbnails" on storage.objects;
drop policy if exists "admin can update review thumbnails" on storage.objects;
drop policy if exists "admin can delete review thumbnails" on storage.objects;

create policy "admin can insert reviews"
  on public.reviews
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'your-email@example.com');

create policy "admin can update reviews"
  on public.reviews
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'your-email@example.com')
  with check ((auth.jwt() ->> 'email') = 'your-email@example.com');

create policy "admin can delete reviews"
  on public.reviews
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'your-email@example.com');

create policy "admin can upload review thumbnails"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'review-thumbnails'
    and (auth.jwt() ->> 'email') = 'your-email@example.com'
  );

create policy "admin can update review thumbnails"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'review-thumbnails'
    and (auth.jwt() ->> 'email') = 'your-email@example.com'
  )
  with check (
    bucket_id = 'review-thumbnails'
    and (auth.jwt() ->> 'email') = 'your-email@example.com'
  );

create policy "admin can delete review thumbnails"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'review-thumbnails'
    and (auth.jwt() ->> 'email') = 'your-email@example.com'
  );
