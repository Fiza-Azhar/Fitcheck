import { BgRemovalRequestBody, BgRemovalResponseBody } from '@/interfaces/bg-removal';

// Talks to the local Python rembg sidecar (services/bg-removal). rembg can't run
// inside an Expo API route — those bundle to one file with only Node built-ins —
// so the actual cutout work lives in a separate process reached over HTTP.
//
// This is best-effort: a null return means "no cutout for this item", and the
// caller saves the garment anyway with the original photo. That is honest
// degradation, not a fake result — the tile shows the real photo, just uncut.

const TIMEOUT_MS = 20000;

export async function removeBackground(imageBase64: string): Promise<string | null> {
  const url = process.env.BG_REMOVAL_URL;
  if (!url) return null; // feature off — sidecar not configured

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body: BgRemovalRequestBody = { imageBase64 };
    const res = await fetch(`${url}/cutout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as BgRemovalResponseBody;
    return typeof data.cutoutBase64 === 'string' && data.cutoutBase64.length > 0
      ? data.cutoutBase64
      : null;
  } catch {
    return null; // sidecar down or slow — degrade to the original photo
  } finally {
    clearTimeout(timer);
  }
}
