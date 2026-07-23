-- Fitcheck garments table for Supabase Postgres.
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
--
-- Column names are quoted to keep camelCase (Postgres lowercases unquoted
-- identifiers). This makes the PostgREST JSON match GarmentRecord exactly, so
-- lib/server/db.ts needs no field renaming. seasons/occasions are jsonb so they
-- come back as real arrays.

create table if not exists public.garments (
  id             text primary key,
  name           text    not null,
  category       text    not null,
  color          text    not null,
  formality      integer not null,
  pattern        text    not null,
  seasons        jsonb   not null,
  occasions      jsonb   not null,
  "wearCount"    integer not null default 0,
  "imageFilename"  text,
  "cutoutFilename" text,
  "createdAt"    text    not null
);

-- Single-user app for now: the server talks to this table with the service_role
-- key, which bypasses row-level security. Enable RLS with policies only when
-- multi-user auth is added (a later step).
