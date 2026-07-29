import { encode } from 'base64-arraybuffer';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// A product photo arrives from the merchant as a plain https URL, but a garment's
// photo has to live in our own Storage bucket like any camera capture — the
// wardrobe renders signed URLs off `imagePath`, and a hotlink to a shop's CDN
// would rot the moment they change it. So the URL is downloaded and re-encoded
// into the same base64 JPEG the add-photo flow produces, ready for createGarment.

// The merchant CDN is a third party we don't control: it can hang or serve a
// huge file. Bound both — a stalled download must not keep the Buy flow pending,
// and an oversize one must not be buffered into memory on a phone.
const TIMEOUT_MS = 15000;
const MAX_BYTES = 8 * 1024 * 1024; // real product photos sit far under 8 MB

export async function fetchRemoteImageBase64(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    // Reject oversize downloads before arrayBuffer() pulls them into memory. Most
    // CDNs send content-length; when one doesn't, the abort timeout is the guard.
    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_BYTES) return null;
    const contentType = res.headers.get('content-type') ?? '';
    const base64 = encode(await res.arrayBuffer());
    // Merchants serve PNG and WEBP as often as JPEG, and the bucket stores
    // garments as .jpg — but a shop photo that already is a JPEG is exactly what
    // createGarment wants, so only the other formats pay for a re-encode.
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return base64;
    // ImageManipulator reads a base64 data URI directly, so the bytes never need
    // a temp file on disk on the way through.
    const dataUri = `data:${contentType || 'image/png'};base64,${base64}`;
    const rendered = await ImageManipulator.manipulate(dataUri).renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, base64: true, compress: 0.7 });
    return saved.base64 ?? null;
  } catch {
    // Callers treat null as "no picture available" and carry on — a merchant
    // image that won't download (or timed out) is never worth failing the save.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
