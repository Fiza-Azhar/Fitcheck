import { createGarment, listGarments, newGarmentId } from '@/lib/server/db';
import { saveImage, saveCutout } from '@/lib/server/images';
import { removeBackground } from '@/lib/server/bg';
import { isUsableBase64Image, parseGarmentDraft } from '@/lib/server/validation';
import {
  CreateGarmentRequestBody,
  CreateGarmentResponseBody,
  GarmentsResponseBody,
} from '@/interfaces/wardrobe-api';

export async function GET(): Promise<Response> {
  try {
    const body: GarmentsResponseBody = { garments: await listGarments() };
    return Response.json(body);
  } catch {
    return Response.json({ error: 'db_failed' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: CreateGarmentRequestBody;
  try {
    body = (await request.json()) as CreateGarmentRequestBody;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  // The edit form is untrusted input, same as Groq's output.
  const draft = parseGarmentDraft(body.draft);
  if (!draft) {
    return Response.json({ error: 'invalid_garment' }, { status: 400 });
  }

  const hasImage = body.imageBase64 !== undefined;
  if (hasImage && !isUsableBase64Image(body.imageBase64)) {
    return Response.json({ error: 'invalid_image' }, { status: 400 });
  }

  try {
    // Name the file after the id before inserting, so a garment row and its
    // photo are written once and never disagree.
    const id = newGarmentId();
    const filename = hasImage ? saveImage(id, body.imageBase64 as string) : null;

    // Best-effort background removal, only when the user asked for it (omitted
    // defaults to true). A null cutout (sidecar off or failed) is fine: the
    // garment still saves and the app renders the original photo.
    let cutoutFilename: string | null = null;
    if (hasImage && body.removeBackground !== false) {
      const cutoutBase64 = await removeBackground(body.imageBase64 as string);
      if (cutoutBase64) cutoutFilename = saveCutout(id, cutoutBase64);
    }

    const record = await createGarment(id, draft, filename, cutoutFilename);
    const responseBody: CreateGarmentResponseBody = { garment: record };
    return Response.json(responseBody, { status: 201 });
  } catch {
    return Response.json({ error: 'db_failed' }, { status: 500 });
  }
}
