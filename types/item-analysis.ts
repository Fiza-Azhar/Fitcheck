import { GarmentDraft } from '@/interfaces/garment';

// Outcome of a vision analysis. Distinguishes a positive "this isn't clothing"
// verdict (which blocks the save) from a genuine analysis failure (which still
// lets the user fill the form by hand). A thrown error is the third case.
export type AnalyzeResult =
  | { status: 'garment'; draft: GarmentDraft }
  | { status: 'not_garment' };
