import { createContext, useContext, useMemo, useState } from 'react';
import { GARMENTS } from '@/lib/data';
import { Garment } from '@/interfaces/garment';
import { WardrobeValue, WardrobeProviderProps } from '@/interfaces/wardrobe';

const WardrobeContext = createContext<WardrobeValue | null>(null);

export function WardrobeProvider({ children }: WardrobeProviderProps) {
  const [items, setItems] = useState<Garment[]>(GARMENTS);
  const value = useMemo<WardrobeValue>(
    () => ({
      items,
      addItem: (g) => setItems((prev) => [{ ...g, id: `u${Date.now()}` }, ...prev]),
    }),
    [items],
  );
  return <WardrobeContext.Provider value={value}>{children}</WardrobeContext.Provider>;
}

export function useWardrobe(): WardrobeValue {
  const ctx = useContext(WardrobeContext);
  if (!ctx) throw new Error('useWardrobe must be used within WardrobeProvider');
  return ctx;
}
