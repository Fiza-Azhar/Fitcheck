import { GarmentRecord } from '@/interfaces/garment-record';

export interface GarmentsResponseBody {
  garments: GarmentRecord[];
}

export interface CreateGarmentRequestBody {
  // Deliberately `unknown`: the client's edit form is untrusted input and gets
  // run through parseGarmentDraft exactly like the AI's output does.
  draft: unknown;
  imageBase64?: string;
  // Whether to run background removal on the photo. Omitted defaults to true
  // (remove), preserving prior behaviour; the Add screen sends it explicitly.
  removeBackground?: boolean;
}

export interface CreateGarmentResponseBody {
  garment: GarmentRecord;
}

export interface ApiErrorBody {
  error: string;
}
