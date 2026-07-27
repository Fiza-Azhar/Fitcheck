-- Shop-sync tables — the two-way link between the browser extension and the app.
-- Run this AFTER schema.sql, in the Supabase dashboard → SQL Editor → New query →
-- Run. It is additive: it creates two new tables and never touches `garments`.
--
-- Column names are quoted to keep camelCase (Postgres lowercases unquoted
-- identifiers) so the PostgREST JSON matches the client interfaces exactly.
-- seasons/occasions are jsonb so they come back as real arrays. Every row is
-- owned by a user and every access is scoped by RLS via the caller's session JWT;
-- the client (app and extension alike) uses the anon key, never the service key.

-- ---------------------------------------------------------------------------
-- shop_checks — one row per product the extension checked while shopping. Feeds
-- the app's "Recently checked" list. Purely a history log: it stores what was
-- seen and the verdict summary, not a full garment.
-- ---------------------------------------------------------------------------
create table if not exists public.shop_checks (
  id                text    primary key,
  "userId"          uuid    not null references auth.users(id) on delete cascade default auth.uid(),
  title             text    not null,
  "productUrl"      text    not null,
  "imageUrl"        text,   -- external CDN URL of the product image; may be null
  price             text,   -- as scraped, e.g. "Rs. 499"; may be null
  category          text,   -- analyzed category, or null when not a garment
  color             text,   -- analyzed dominant colour hex, or null
  -- 'similar' | 'goes' | 'fresh' | 'not_garment' — what the badge showed.
  verdict           text    not null,
  "goesWithCount"   integer not null default 0,
  "alreadyOwnCount" integer not null default 0,
  "checkedAt"       text    not null
);

alter table public.shop_checks enable row level security;

create policy "shop_checks - select own" on public.shop_checks
  for select using ("userId" = auth.uid());
create policy "shop_checks - insert own" on public.shop_checks
  for insert with check ("userId" = auth.uid());
create policy "shop_checks - delete own" on public.shop_checks
  for delete using ("userId" = auth.uid());

-- ---------------------------------------------------------------------------
-- wishlist_items — a candidate garment the user saved from the extension to
-- consider buying. Holds the full garment shape (so it can be promoted into the
-- wardrobe on purchase) plus the product context it came from.
-- ---------------------------------------------------------------------------
create table if not exists public.wishlist_items (
  id            text    primary key,
  "userId"      uuid    not null references auth.users(id) on delete cascade default auth.uid(),
  name          text    not null,
  category      text    not null,
  color         text    not null,
  formality     integer not null,
  pattern       text    not null,
  seasons       jsonb   not null,
  occasions     jsonb   not null,
  "productUrl"  text,
  "imageUrl"    text,   -- external CDN URL of the product image; may be null
  price         text,
  "createdAt"   text    not null
);

alter table public.wishlist_items enable row level security;

create policy "wishlist_items - select own" on public.wishlist_items
  for select using ("userId" = auth.uid());
create policy "wishlist_items - insert own" on public.wishlist_items
  for insert with check ("userId" = auth.uid());
create policy "wishlist_items - update own" on public.wishlist_items
  for update using ("userId" = auth.uid()) with check ("userId" = auth.uid());
create policy "wishlist_items - delete own" on public.wishlist_items
  for delete using ("userId" = auth.uid());
