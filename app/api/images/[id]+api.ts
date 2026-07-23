import { getGarment } from '@/lib/server/db';
import { readImage, readCutout } from '@/lib/server/images';

export async function GET(request: Request, { id }: Record<string, string>): Promise<Response> {
  if (!id) return new Response(null, { status: 400 });

  // Resolve the filename via the row rather than trusting the URL, so only
  // photos an actual garment owns are ever served.
  const garment = await getGarment(id);
  if (!garment) return new Response(null, { status: 404 });

  const wantsCutout = new URL(request.url).searchParams.get('variant') === 'cutout';
  const filename = wantsCutout ? garment.cutoutFilename : garment.imageFilename;
  if (!filename) return new Response(null, { status: 404 });

  const bytes = wantsCutout ? readCutout(filename) : readImage(filename);
  if (!bytes) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': wantsCutout ? 'image/png' : 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
