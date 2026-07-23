import { Category, Formality, Occasion, SeasonName } from '@/types/garment';

// A garment as persisted server-side. Differs from `Garment` deliberately: the
// server stores a bare filename and stays ignorant of how clients reach it, so
// deploying behind a real origin later is a client config change, not a data
// migration.
export interface GarmentRecord {
  id: string;
  name: string;
  category: Category;
  color: string;
  formality: Formality;
  pattern: string;
  seasons: SeasonName[];
  occasions: Occasion[];
  wearCount: number;
  imageFilename: string | null;
  // Transparent PNG cutout produced by the background-removal sidecar. Null when
  // the sidecar is unconfigured or failed — the app then falls back to the
  // original photo rather than inventing anything.
  cutoutFilename: string | null;
  createdAt: string;
}

// Row shape as node:sqlite hands it back — arrays are JSON-encoded TEXT.
export interface GarmentRow {
  id: string;
  name: string;
  category: string;
  color: string;
  formality: number;
  pattern: string;
  seasons: string;
  occasions: string;
  wearCount: number;
  imageFilename: string | null;
  cutoutFilename: string | null;
  createdAt: string;
}
