import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Garment, GarmentDraft } from '@/interfaces/garment';
import { WardrobeProviderProps, WardrobeValue } from '@/interfaces/wardrobe';
import { LoadState } from '@/types/load-state';
import { createGarment, deleteGarment, fetchGarments } from '@/lib/wardrobeApi';

const WardrobeContext = createContext<WardrobeValue | null>(null);

// A cache over the server, not the source of truth. Mutations hit the API first
// and only touch local state once the server confirms them, so what's on screen
// is always something that actually persisted.
export function WardrobeProvider({ children }: WardrobeProviderProps) {
  const [items, setItems] = useState<Garment[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      setItems(await fetchGarments());
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach your wardrobe.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addItem = useCallback(
    async (draft: GarmentDraft, imageBase64?: string, removeBackground?: boolean) => {
      const created = await createGarment(draft, imageBase64, removeBackground);
      setItems((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const removeItem = useCallback(async (id: string) => {
    await deleteGarment(id);
    setItems((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const value = useMemo<WardrobeValue>(
    () => ({ items, state, error, reload, addItem, removeItem }),
    [items, state, error, reload, addItem, removeItem],
  );

  return <WardrobeContext.Provider value={value}>{children}</WardrobeContext.Provider>;
}

export function useWardrobe(): WardrobeValue {
  const ctx = useContext(WardrobeContext);
  if (!ctx) throw new Error('useWardrobe must be used within WardrobeProvider');
  return ctx;
}
