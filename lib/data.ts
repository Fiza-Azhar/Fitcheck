import { FilterOption } from '@/interfaces/filter';

// GARMENTS lived here: 12 hardcoded items with bundled stock photos, seeded into
// WardrobeContext on every launch. Removed when the wardrobe became real — items
// now come from the database and are ones the user actually photographed.

export const FILTERS: FilterOption[] = [
  { key: 'all', label: 'All' },
  { key: 'office', label: 'Office' },
  { key: 'casual', label: 'Casual' },
  { key: 'wedding', label: 'Wedding' },
  { key: 'winter', label: 'Winter' },
];
