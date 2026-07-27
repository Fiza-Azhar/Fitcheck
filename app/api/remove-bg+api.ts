import { removeBackground } from '@/lib/server/bg';
import { isUsableBase64Image } from '@/lib/server/validation';

// Thin proxy to the rembg sidecar. It exists so the client (which uploads images
// straight to Supabase Storage) can still get a cutout without holding the
// sidecar URL, and without this route ever touching the database. A null cutout
// is a valid, successful response — the sidecar being off or slow is honest
// degradation, and the client saves the garment with its original photo.
export async function POST(request: Request): Promise<Response> {
  let imageBase64: string;
  try {
    const body = (await request.json()) as { imageBase64?: unknown };
    if (!isUsableBase64Image(body.imageBase64)) throw new Error('bad image');
    imageBase64 = body.imageBase64 as string;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const cutoutBase64 = await removeBackground(imageBase64);
  return Response.json({ cutoutBase64 });
}
