import { Garment } from '@/interfaces/garment';
import { FilterKey } from '@/types/filter';

export function filterByOccasion(items: Garment[], filter: FilterKey): Garment[] {
  if (filter === 'all') return items;
  return items.filter((g) => g.occasions.includes(filter));
}
