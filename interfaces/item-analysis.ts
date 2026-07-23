import { GarmentDraft } from '@/interfaces/garment';

export interface AnalyzeItemRequestBody {
  imageBase64: string;
}

export interface AnalyzeItemResponseBody {
  draft: GarmentDraft;
}
