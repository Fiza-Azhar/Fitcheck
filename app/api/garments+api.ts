import { CreateGarmentRequestBody, Garment } from '@/interfaces/garment';
import { Category, Formality, Occasion, SeasonName } from '@/types/garment';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';

interface GarmentRow {
  id: string;
  name: string;
  category: Category;
  color: string;
  formality: Formality;
  pattern: string;
  seasons: SeasonName[];
  occasions: Occasion[];
  imageData: string | null;
  imageType: string | null;
  cutoutData: string | null;
  cutoutType: string | null;
}

function dataUri(data: string | null, type: string | null): string | null {
  if (!data || !type) return null;
  return `data:${type};base64,${data}`;
}

function toGarment(row: GarmentRow): Garment {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    color: row.color,
    formality: row.formality,
    pattern: row.pattern,
    seasons: row.seasons,
    occasions: row.occasions,
    imageUrl: dataUri(row.imageData, row.imageType),
    cutoutUrl: dataUri(row.cutoutData, row.cutoutType),
  };
}

function newGarmentId(): string {
  return `g${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET(request: Request): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const rows = await sql`
    select id, name, category, color, formality, pattern, seasons, occasions,
           "imageData", "imageType", "cutoutData", "cutoutType"
    from garments
    where "userId" = ${auth.userId}
    order by "createdAt" desc
  `;
  const garments: Garment[] = (rows as GarmentRow[]).map(toGarment);
  return Response.json(garments);
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  let body: CreateGarmentRequestBody;
  try {
    body = (await request.json()) as CreateGarmentRequestBody;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const id = newGarmentId();
  const imageData = body.imageBase64 ?? null;
  const imageType = imageData ? 'image/jpeg' : null;
  const cutoutData = body.cutoutBase64 ?? null;
  const cutoutType = cutoutData ? 'image/png' : null;

  const rows = await sql`
    insert into garments (
      id, "userId", name, category, color, formality, pattern, seasons, occasions,
      "wearCount", "imageData", "imageType", "cutoutData", "cutoutType", "createdAt"
    ) values (
      ${id}, ${auth.userId}, ${body.name}, ${body.category}, ${body.color}, ${body.formality},
      ${body.pattern}, ${JSON.stringify(body.seasons)}, ${JSON.stringify(body.occasions)},
      0, ${imageData}, ${imageType}, ${cutoutData}, ${cutoutType}, ${new Date().toISOString()}
    )
    returning id, name, category, color, formality, pattern, seasons, occasions,
              "imageData", "imageType", "cutoutData", "cutoutType"
  `;
  const garment = toGarment(rows[0] as GarmentRow);
  return Response.json(garment);
}
