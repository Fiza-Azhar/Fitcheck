import { ReactNode } from 'react';
import { Garment } from '@/interfaces/garment';

export interface WardrobeValue {
  items: Garment[];
  addItem: (g: Omit<Garment, 'id'>) => void;
}
export interface WardrobeProviderProps { children: ReactNode; }
