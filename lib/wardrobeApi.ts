import { Garment, GarmentDraft } from '@/interfaces/garment';
import { GarmentRecord } from '@/interfaces/garment-record';
import {
  CreateGarmentRequestBody,
  CreateGarmentResponseBody,
  GarmentsResponseBody,
} from '@/interfaces/wardrobe-api';
import { cutoutUrlFor, imageUrlFor } from '@/lib/apiBase';

const TIMEOUT_MS = 15000;

// Failures throw. Nothing here invents a fallback result — a wardrobe that
// silently renders as empty when the server is down is indistinguishable from
// a wardrobe that IS empty, which is exactly the class of bug that hid the
// broken Groq key for weeks.
async function request(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(path, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`${path} responded ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function toGarment(record: GarmentRecord): Garment {
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
    imageUrl: imageUrlFor(record.id, record.imageFilename),
    cutoutUrl: cutoutUrlFor(record.id, record.cutoutFilename),
  };
}

export async function fetchGarments(): Promise<Garment[]> {
  const res = await request('/api/garments');
  const body = (await res.json()) as GarmentsResponseBody;
  return body.garments.map(toGarment);
}

export async function createGarment(
  draft: GarmentDraft,
  imageBase64?: string,
  removeBackground?: boolean,
): Promise<Garment> {
  const body: CreateGarmentRequestBody = { draft, imageBase64, removeBackground };
  const res = await request('/api/garments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const created = (await res.json()) as CreateGarmentResponseBody;
  return toGarment(created.garment);
}

export async function deleteGarment(id: string): Promise<void> {
  await request(`/api/garments/${id}`, { method: 'DELETE' });
}
