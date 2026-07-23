import { GarmentDraft } from '@/interfaces/garment';
import { AnalyzeItemRequestBody, AnalyzeItemResponseBody } from '@/interfaces/item-analysis';
import { AnalyzeResult } from '@/types/item-analysis';

const TIMEOUT_MS = 20000;

// Vision on a phone photo is slower than a text completion; 20s is generous on
// purpose, because a timeout here costs the user their whole capture.
export async function analyzeItemPhoto(imageBase64: string): Promise<AnalyzeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body: AnalyzeItemRequestBody = { imageBase64 };
    const res = await fetch('/api/analyze-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    // 422 is the model's positive verdict that the photo isn't clothing — a
    // real outcome, not a failure, so it returns rather than throws.
    if (res.status === 422) return { status: 'not_garment' };
    if (!res.ok) throw new Error(`analysis failed (${res.status})`);
    const data = (await res.json()) as AnalyzeItemResponseBody;
    return { status: 'garment', draft: data.draft };
  } finally {
    clearTimeout(timer);
  }
}

// What the form starts from when the AI can't help. Deliberately blank rather
// than plausible: an invented "Rust Corduroy Overshirt" that the user doesn't
// notice is worse than an empty field they must fill in.
export function emptyDraft(): GarmentDraft {
  return {
    name: '',
    category: 'top',
    color: '#C9BBA0',
    pattern: 'solid',
    formality: 3,
    seasons: [],
    occasions: [],
  };
}
