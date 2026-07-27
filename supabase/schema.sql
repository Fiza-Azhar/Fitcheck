-- Fitcheck garments — per-user schema with Row-Level Security and Storage.
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
--
-- Column names are quoted to keep camelCase (Postgres lowercases unquoted
-- identifiers) so the PostgREST JSON matches GarmentRecord exactly — no field
-- renaming on the client. seasons/occasions are jsonb so they come back as real
-- arrays.
--
-- This DROPS the old single-user table (its rows had no owner and its photos
-- lived on local disk, so they can't be carried into the per-user model). Every
-- row is now owned by a user and every access is scoped by RLS via the caller's
-- session JWT — the client uses the anon key, never the service key.

drop table if exists public.garments;

create table public.garments (
  id             text primary key,
  "userId"       uuid    not null references auth.users(id) on delete cascade default auth.uid(),
  name           text    not null,
  category       text    not null,
  color          text    not null,
  formality      integer not null,
  pattern        text    not null,
  seasons        jsonb   not null,
  occasions      jsonb   not null,
  "wearCount"    integer not null default 0,
  -- Storage object paths under the garment-images bucket, e.g.
  -- "<uid>/<id>.jpg" and "<uid>/<id>-cutout.png". Null when absent; the client
  -- turns these into short-lived signed URLs for display.
  "imagePath"    text,
  "cutoutPath"   text,
  "createdAt"    text    not null
);

-- Row-Level Security: a user may only ever touch their own garment rows. The
-- userId column defaults to auth.uid(), so the client never sends it.
alter table public.garments enable row level security;

create policy "garments - select own" on public.garments
  for select using ("userId" = auth.uid());
create policy "garments - insert own" on public.garments
  for insert with check ("userId" = auth.uid());
create policy "garments - update own" on public.garments
  for update using ("userId" = auth.uid()) with check ("userId" = auth.uid());
create policy "garments - delete own" on public.garments
  for delete using ("userId" = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: private bucket for garment photos + cutouts.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('garment-images', 'garment-images', false)
on conflict (id) do nothing;

-- Objects are namespaced by uid in the first path segment. A user may only read
-- or write objects whose first folder equals their own uid, so one user can
-- never reach another's images even with a guessed path.
create policy "garment images - select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'garment-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "garment images - insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'garment-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "garment images - update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'garment-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "garment images - delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'garment-images' and (storage.foldername(name))[1] = auth.uid()::text);
