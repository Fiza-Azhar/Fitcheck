import { ReactNode } from 'react';
import { Garment, GarmentDraft } from '@/interfaces/garment';
import { LoadState } from '@/types/load-state';

export interface WardrobeValue {
  items: Garment[];
  state: LoadState;
  error: string | null;
  reload: () => Promise<void>;
  addItem: (draft: GarmentDraft, imageBase64?: string, removeBackground?: boolean) => Promise<Garment>;
  removeItem: (id: string) => Promise<void>;
}

export interface WardrobeProviderProps {
  children: ReactNode;
}
