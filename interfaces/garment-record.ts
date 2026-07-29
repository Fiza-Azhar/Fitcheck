import { Category, Formality, Occasion, SeasonName } from '@/types/garment';

// A garment row as stored in Supabase Postgres and returned by the client
// (PostgREST). Differs from `Garment` deliberately: the row stores Storage object
// *paths*, not display URLs — the client mints short-lived signed URLs from them,
// so a row is portable across devices and the extension.
export interface GarmentRecord {
  id: string;
  // Owner. Defaulted to auth.uid() by the DB and enforced by RLS; the client
  // sets it explicitly on insert so the returned row is complete.
  userId: string;
  name: string;
  category: Category;
  color: string;
  formality: Formality;
  pattern: string;
  seasons: SeasonName[];
  occasions: Occasion[];
  // Still a column (not null default 0), so the row type keeps it — but nothing
  // increments it and no screen shows it since the wear badges were removed.
  wearCount: number;
  // Storage object paths under the garment-images bucket, or null. The cutout is
  // the transparent PNG from the bg-removal sidecar; null when unconfigured or it
  // failed — the app then falls back to the original photo rather than inventing.
  imagePath: string | null;
  cutoutPath: string | null;
  createdAt: string;
}
