import { CreateGarmentRequestBody, Garment, GarmentDraft } from '@/interfaces/garment';
import { apiFetch } from '@/lib/apiClient';

// Talks to /api/garments with a bearer token; the route filters by the userId
// it decodes from that token, so there is no manual userId filtering here and
// no way to read another user's rows. Failures throw — nothing here invents a
// fallback, matching the app's "a silently-empty wardrobe is a bug, not a
// state" rule.

// Best-effort background removal. The rembg sidecar is server-only (its URL
// lives in a non-public env var), so the client reaches it through a thin API
// route that returns the cutout base64 without touching the database. Null
// means "no cutout" — the garment still saves with its original photo.
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

export async function fetchGarments(): Promise<Garment[]> {
  return apiFetch<Garment[]>('/api/garments');
}

export async function createGarment(
  draft: GarmentDraft,
  imageBase64?: string,
  removeBackground?: boolean,
): Promise<Garment> {
  let cutoutBase64: string | undefined;
  if (imageBase64 && removeBackground !== false) {
    // Best-effort: a failed cutout degrades to the original photo rather than
    // failing the whole create.
    cutoutBase64 = (await requestCutout(imageBase64)) ?? undefined;
  }

  const body: CreateGarmentRequestBody = { ...draft, imageBase64, cutoutBase64 };
  return apiFetch<Garment>('/api/garments', { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteGarment(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/garments/${id}`, { method: 'DELETE' });
}
