import { decode } from 'base64-arraybuffer';
import { Garment, GarmentDraft } from '@/interfaces/garment';
import { GarmentRecord } from '@/interfaces/garment-record';
import { supabase } from '@/lib/supabase';

// Talks straight to Supabase with the anon key. RLS scopes every query to the
// signed-in user via the session JWT, so there is no manual userId filtering and
// no way to read another user's rows. Failures throw — nothing here invents a
// fallback, matching the app's "a silently-empty wardrobe is a bug, not a state"
// rule.

const BUCKET = 'garment-images';
// Signed URLs are short-lived; the wardrobe re-fetches (and re-signs) on load and
// after every mutation, so an hour is comfortably longer than a session's use.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function newGarmentId(): string {
  return `g${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

// Row → the shape the app renders. Image/cutout paths become signed URLs; a
// missing path stays null and the tile falls back to the garment colour.
async function toGarment(record: GarmentRecord): Promise<Garment> {
  const [imageUrl, cutoutUrl] = await Promise.all([
    signedUrl(record.imagePath),
    signedUrl(record.cutoutPath),
  ]);
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    color: record.color,
    formality: record.formality,
    pattern: record.pattern,
    seasons: record.seasons,
    occasions: record.occasions,
    wearCount: record.wearCount,
    imageUrl,
    cutoutUrl,
  };
}

// Best-effort background removal. The rembg sidecar is server-only (its URL lives
// in a non-public env var), so the client reaches it through a thin API route
// that returns the cutout base64 without touching the database. Null means "no
// cutout" — the garment still saves with its original photo.
// Must outlast the route's own wait on the sidecar (lib/server/bg.ts), or a cold
// start gets aborted here just as the server was about to answer — the client
// would report "no cutout" for a request that actually succeeded.
const CUTOUT_TIMEOUT_MS = 70000;

async function requestCutout(imageBase64: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CUTOUT_TIMEOUT_MS);
  try {
    const res = await fetch('/api/remove-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { cutoutBase64: string | null };
    return typeof data.cutoutBase64 === 'string' && data.cutoutBase64.length > 0
      ? data.cutoutBase64
      : null;
  } catch {
    // Sidecar off, asleep, or slow — the garment still saves with its photo.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function uploadImage(path: string, base64: string, contentType: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType, upsert: true });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
}

export async function fetchGarments(): Promise<Garment[]> {
  const { data, error } = await supabase
    .from('garments')
    .select('*')
    .order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);
  return Promise.all((data as GarmentRecord[]).map(toGarment));
}

export async function createGarment(
  draft: GarmentDraft,
  imageBase64?: string,
  removeBackground?: boolean,
): Promise<Garment> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('You are signed out — sign in and try again.');

  const id = newGarmentId();
  let imagePath: string | null = null;
  let cutoutPath: string | null = null;

  if (imageBase64) {
    // The photo must land before the row so a saved garment never points at a
    // missing image. A failed upload aborts the whole create.
    imagePath = `${uid}/${id}.jpg`;
    await uploadImage(imagePath, imageBase64, 'image/jpeg');

    if (removeBackground !== false) {
      const cutoutBase64 = await requestCutout(imageBase64);
      if (cutoutBase64) {
        const path = `${uid}/${id}-cutout.png`;
        try {
          await uploadImage(path, cutoutBase64, 'image/png');
          cutoutPath = path;
        } catch {
          // Cutout is a nicety, not a requirement — degrade to the original.
          cutoutPath = null;
        }
      }
    }
  }

  const row: GarmentRecord = {
    id,
    userId: uid,
    ...draft,
    wearCount: 0,
    imagePath,
    cutoutPath,
    createdAt: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('garments').insert(row).select().single();
  if (error) throw new Error(error.message);
  return toGarment(data as GarmentRecord);
}

export async function deleteGarment(id: string): Promise<void> {
  // Read the paths first so the Storage objects go with the row; RLS ensures we
  // only ever see (and delete) our own.
  const { data } = await supabase
    .from('garments')
    .select('imagePath, cutoutPath')
    .eq('id', id)
    .single();

  const paths = [data?.imagePath, data?.cutoutPath].filter((p): p is string => Boolean(p));
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);

  const { error } = await supabase.from('garments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
