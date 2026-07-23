import { getGarment, removeGarment } from '@/lib/server/db';
import { deleteImage, deleteCutout } from '@/lib/server/images';

export async function DELETE(request: Request, { id }: Record<string, string>): Promise<Response> {
  if (!id) return Response.json({ error: 'bad_request' }, { status: 400 });

  try {
    const existing = await getGarment(id);
    if (!existing) return Response.json({ error: 'not_found' }, { status: 404 });

    await removeGarment(id);
    // Row first, then the file: an orphaned file is harmless, a row pointing at
    // a missing photo renders as a broken tile.
    if (existing.imageFilename) deleteImage(existing.imageFilename);
    if (existing.cutoutFilename) deleteCutout(existing.cutoutFilename);

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: 'db_failed' }, { status: 500 });
  }
}
