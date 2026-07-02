-- Replace the email below with the administrator email created in Supabase Auth.

drop policy if exists "admin can insert reviews" on public.reviews;
drop policy if exists "admin can update reviews" on public.reviews;
drop policy if exists "admin can delete reviews" on public.reviews;
drop policy if exists "invited users can insert reviews" on public.reviews;
drop policy if exists "authors can update own reviews" on public.reviews;
drop policy if exists "authors can delete own reviews" on public.reviews;
drop policy if exists "admin can insert watchlist items" on public.watchlist_items;
drop policy if exists "admin can update watchlist items" on public.watchlist_items;
drop policy if exists "admin can delete watchlist items" on public.watchlist_items;
drop policy if exists "invited users can insert watchlist items" on public.watchlist_items;
drop policy if exists "authors can update own watchlist items" on public.watchlist_items;
drop policy if exists "authors can delete own watchlist items" on public.watchlist_items;
drop policy if exists "admin can read invite codes" on public.invite_codes;
drop policy if exists "admin can insert invite codes" on public.invite_codes;
drop policy if exists "admin can update invite codes" on public.invite_codes;
drop policy if exists "admin can delete invite codes" on public.invite_codes;
drop policy if exists "admin can read invite code uses" on public.invite_code_uses;
drop policy if exists "invited users can upload review thumbnails" on storage.objects;
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

create policy "invited users can insert reviews"
  on public.reviews
  for insert
  to authenticated
  with check (
    public.is_invited_user()
    and author_id = auth.uid()
  );

create policy "authors can update own reviews"
  on public.reviews
  for update
  to authenticated
  using (
    public.is_invited_user()
    and author_id = auth.uid()
  )
  with check (
    public.is_invited_user()
    and author_id = auth.uid()
  );

create policy "authors can delete own reviews"
  on public.reviews
  for delete
  to authenticated
  using (
    public.is_invited_user()
    and author_id = auth.uid()
  );

create policy "admin can insert watchlist items"
  on public.watchlist_items
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'your-email@example.com');

create policy "admin can update watchlist items"
  on public.watchlist_items
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'your-email@example.com')
  with check ((auth.jwt() ->> 'email') = 'your-email@example.com');

create policy "admin can delete watchlist items"
  on public.watchlist_items
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'your-email@example.com');

create policy "invited users can insert watchlist items"
  on public.watchlist_items
  for insert
  to authenticated
  with check (
    public.is_invited_user()
    and author_id = auth.uid()
  );

create policy "authors can update own watchlist items"
  on public.watchlist_items
  for update
  to authenticated
  using (
    public.is_invited_user()
    and author_id = auth.uid()
  )
  with check (
    public.is_invited_user()
    and author_id = auth.uid()
  );

create policy "authors can delete own watchlist items"
  on public.watchlist_items
  for delete
  to authenticated
  using (
    public.is_invited_user()
    and author_id = auth.uid()
  );

create policy "admin can read invite codes"
  on public.invite_codes
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'your-email@example.com');

create policy "admin can insert invite codes"
  on public.invite_codes
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'your-email@example.com');

create policy "admin can update invite codes"
  on public.invite_codes
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'your-email@example.com')
  with check ((auth.jwt() ->> 'email') = 'your-email@example.com');

create policy "admin can delete invite codes"
  on public.invite_codes
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'your-email@example.com');

create policy "admin can read invite code uses"
  on public.invite_code_uses
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'your-email@example.com');

create policy "invited users can upload review thumbnails"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'review-thumbnails'
    and public.is_invited_user()
  );

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
