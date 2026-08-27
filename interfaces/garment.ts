import { Category, Formality, Occasion, SeasonName } from '@/types/garment';

// The garment as the app renders it. `imageUrl` is absolute (composed client-side
// against the API base) because <Image> on native cannot resolve a relative path
// the way a browser can.
export interface Garment {
  id: string;
  name: string;
  category: Category;
  color: string;          // hex, used as tile background and photo fallback
  formality: Formality;
  pattern: string;
  seasons: SeasonName[];
  occasions: Occasion[];
  imageUrl: string | null;
  // Absolute URL to the transparent cutout, or null. Tiles prefer this over
  // imageUrl for a clean flatlay; null just falls back to the original photo.
  cutoutUrl: string | null;
}

// The garment fields the AI proposes and the user edits, before it exists server-side.
export type GarmentDraft = Omit<Garment, 'id' | 'imageUrl' | 'cutoutUrl'>;

// POST /api/garments body. Photos travel as raw base64 (no data: prefix,
// matching what the camera/picker and the bg-removal sidecar already produce);
// the server stores them as bytea and hands back data URIs in the response.
export interface CreateGarmentRequestBody extends GarmentDraft {
  imageBase64?: string;
  cutoutBase64?: string;
}
