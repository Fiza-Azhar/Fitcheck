-- Fitcheck — Neon Postgres schema.
-- Run this in the Neon dashboard -> SQL Editor -> New query -> Run.
--
-- Replaces Supabase Auth + RLS + Storage: there is no auth.uid() here, so every
-- table carries a plain "userId" column and every API route (app/api/**+api.ts)
-- filters by the userId it decodes from the caller's JWT — see lib/server/auth.ts.
-- Column names are quoted to keep camelCase so JSON responses match the client
-- interfaces exactly. seasons/occasions are jsonb so they come back as real arrays.

create extension if not exists pgcrypto;

create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  "passwordHash" text not null,
  name           text not null,
  "createdAt"    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- garments — the core wardrobe. Photos live in the row itself as base64 text
-- instead of a separate storage bucket: there's no Supabase Storage equivalent
-- wired up here, and at this project's scale a couple of images per row is
-- simpler than standing up a second service. Stored as base64 (not bytea) on
-- purpose — Neon's HTTP driver rather than a raw TCP connection, and base64
-- text round-trips over it with no binary-encoding guesswork. The API route
-- wraps it as a data URI on the way out, so the client's
-- Garment.imageUrl/cutoutUrl never change shape.
-- ---------------------------------------------------------------------------
create table if not exists garments (
  id             text primary key,
  "userId"       uuid    not null references users(id) on delete cascade,
  name           text    not null,
  category       text    not null,
  color          text    not null,
  formality      integer not null,
  pattern        text    not null,
  seasons        jsonb   not null,
  occasions      jsonb   not null,
  "wearCount"    integer not null default 0,
  "imageData"    text,
  "imageType"    text,
  "cutoutData"   text,
  "cutoutType"   text,
  "createdAt"    text    not null
);

create index if not exists garments_user_id_idx on garments ("userId");

-- ---------------------------------------------------------------------------
-- wishlist_items — candidates saved from the browser extension to consider
-- buying. imageUrl here is the merchant's own CDN link, not our storage.
-- ---------------------------------------------------------------------------
create table if not exists wishlist_items (
  id            text    primary key,
  "userId"      uuid    not null references users(id) on delete cascade,
  name          text    not null,
  category      text    not null,
  color         text    not null,
  formality     integer not null check (formality between 1 and 5),
  pattern       text    not null,
  seasons       jsonb   not null check (jsonb_typeof(seasons) = 'array'),
  occasions     jsonb   not null check (jsonb_typeof(occasions) = 'array'),
  "productUrl"  text,
  "imageUrl"    text,
  price         text,
  "createdAt"   text    not null
);

create index if not exists wishlist_items_user_id_idx on wishlist_items ("userId");

-- ---------------------------------------------------------------------------
-- shop_checks — append-only history of products the extension checked while
-- shopping. Feeds the app's "Recently checked" list.
-- ---------------------------------------------------------------------------
create table if not exists shop_checks (
  id                text    primary key,
  "userId"          uuid    not null references users(id) on delete cascade,
  title             text    not null,
  "productUrl"      text    not null,
  "imageUrl"        text,
  price             text,
  category          text,
  color             text,
  verdict           text    not null check (verdict in ('similar', 'goes', 'fresh', 'not_garment')),
  "goesWithCount"   integer not null default 0 check ("goesWithCount" >= 0),
  "alreadyOwnCount" integer not null default 0 check ("alreadyOwnCount" >= 0),
  "checkedAt"       text    not null
);

create index if not exists shop_checks_user_id_idx on shop_checks ("userId");
