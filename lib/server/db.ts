import path from 'node:path';
import { GarmentDraft } from '@/interfaces/garment';
import { GarmentRecord } from '@/interfaces/garment-record';

// The only module in the app that knows where garment records are stored. API
// routes call list/get/create/remove and never see the backend — this file
// moved from node:sqlite to Supabase Postgres without any route changing.
//
// It talks to Supabase over its REST API (PostgREST) with `fetch`, NOT a native
// Postgres driver: Expo API routes bundle to one file with only Node built-ins,
// so drivers like `pg` (raw TCP, native bindings) don't bundle — exactly why
// MongoDB was rejected. `fetch` is global, the same way the app calls Groq.

// Kept for lib/server/images.ts: item photos still live on local disk under
// .data/. Only the database moved to the cloud in this step.
export const DATA_DIR = path.join(process.cwd(), '.data');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Resolve the table endpoint lazily so a missing config is a clear runtime error
// (surfaced by the route as 500) rather than a blank wardrobe that looks empty.
function endpoint(): string {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Supabase not configured: set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  }
  return `${SUPABASE_URL}/rest/v1/garments`;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SERVICE_KEY as string,
    Authorization: `Bearer ${SERVICE_KEY as string}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// PostgREST returns rows already shaped like GarmentRecord: camelCase columns
// (quoted in the schema) and seasons/occasions as jsonb arrays. So the JSON maps
// straight onto GarmentRecord with no field renaming or JSON.parse.

export async function listGarments(): Promise<GarmentRecord[]> {
  const res = await fetch(`${endpoint()}?select=*&order=createdAt.desc`, { headers: headers() });
  if (!res.ok) throw new Error(`supabase list failed (${res.status})`);
  return (await res.json()) as GarmentRecord[];
}

export async function getGarment(id: string): Promise<GarmentRecord | null> {
  const res = await fetch(`${endpoint()}?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`supabase get failed (${res.status})`);
  const rows = (await res.json()) as GarmentRecord[];
  return rows[0] ?? null;
}

// Exposed so callers can name an image file after the row before inserting it,
// keeping creation a single write.
export function newGarmentId(): string {
  return `g${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

export async function createGarment(
  id: string,
  draft: GarmentDraft,
  imageFilename: string | null,
  cutoutFilename: string | null,
): Promise<GarmentRecord> {
  const record: GarmentRecord = {
    id,
    ...draft,
    wearCount: 0,
    imageFilename,
    cutoutFilename,
    createdAt: new Date().toISOString(),
  };
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`supabase insert failed (${res.status})`);
  const rows = (await res.json()) as GarmentRecord[];
  return rows[0] ?? record;
}

export async function removeGarment(id: string): Promise<boolean> {
  const res = await fetch(`${endpoint()}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=representation' }),
  });
  if (!res.ok) throw new Error(`supabase delete failed (${res.status})`);
  const rows = (await res.json()) as GarmentRecord[];
  return rows.length > 0;
}
