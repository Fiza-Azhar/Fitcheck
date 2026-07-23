import {
  CATEGORIES,
  FORMALITY_MAX,
  FORMALITY_MIN,
  HEX_COLOR,
  OCCASIONS,
  SEASONS,
} from '@/constants/garment';
import { GarmentDraft } from '@/interfaces/garment';
import { Category, Formality, Occasion, SeasonName } from '@/types/garment';

// Everything here rejects rather than coerces. A garment the AI describes badly
// is an error the user can see and correct; a garment we silently "fixed" is a
// wrong row that surfaces months later as an inexplicable outfit suggestion.

function isMember<T extends readonly string[]>(list: T, v: unknown): v is T[number] {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
}

function parseStringArray<T extends readonly string[]>(list: T, v: unknown): T[number][] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: T[number][] = [];
  for (const entry of v) {
    if (!isMember(list, entry)) return null;
    if (!out.includes(entry)) out.push(entry);
  }
  return out;
}

function parseName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (trimmed.length === 0 || trimmed.length > 60) return null;
  return trimmed;
}

function parseFormality(v: unknown): Formality | null {
  if (typeof v !== 'number' || !Number.isInteger(v)) return null;
  if (v < FORMALITY_MIN || v > FORMALITY_MAX) return null;
  return v as Formality;
}

/**
 * Validates an untrusted garment body — from Groq, or from the client's edit
 * form, which is equally untrusted. Returns null if any field is unusable.
 */
export function parseGarmentDraft(value: unknown): GarmentDraft | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;

  const name = parseName(v.name);
  if (name === null) return null;

  if (!isMember(CATEGORIES, v.category)) return null;
  const category: Category = v.category;

  if (typeof v.color !== 'string' || !HEX_COLOR.test(v.color)) return null;
  const color = v.color.toUpperCase();

  const formality = parseFormality(v.formality);
  if (formality === null) return null;

  const pattern = parseName(v.pattern);
  if (pattern === null) return null;

  const seasons: SeasonName[] | null = parseStringArray(SEASONS, v.seasons);
  if (seasons === null) return null;

  const occasions: Occasion[] | null = parseStringArray(OCCASIONS, v.occasions);
  if (occasions === null) return null;

  return { name, category, color, formality, pattern, seasons, occasions };
}

// Groq is told to emit exactly this shape, but "told to" is not "did".
export function parseAnalysis(raw: unknown): GarmentDraft | null {
  return parseGarmentDraft(raw);
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function isUsableBase64Image(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0) return false;
  // base64 encodes 3 bytes per 4 chars; approximate to stay under Groq's cap.
  return (v.length * 3) / 4 <= MAX_IMAGE_BYTES;
}
