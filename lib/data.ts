import { Garment } from '@/interfaces/garment';
import { FilterOption } from '@/interfaces/filter';

export const FILTERS: FilterOption[] = [
  { key: 'all', label: 'All' },
  { key: 'office', label: 'Office' },
  { key: 'casual', label: 'Casual' },
  { key: 'wedding', label: 'Wedding' },
  { key: 'winter', label: 'Winter' },
];

export const GARMENTS: Garment[] = [
  { id: 't1', name: 'White Oxford Shirt', category: 'top', color: '#F3EFE6', formality: 4, pattern: 'solid', seasons: ['spring','summer','autumn'], occasions: ['office','wedding'], wearCount: 12, image: null },
  { id: 't2', name: 'Charcoal Merino Knit', category: 'top', color: '#4A4A4E', formality: 3, pattern: 'solid', seasons: ['autumn','winter'], occasions: ['office','casual','winter'], wearCount: 5, image: null },
  { id: 't3', name: 'Sage Linen Tee', category: 'top', color: '#A7B79A', formality: 2, pattern: 'solid', seasons: ['spring','summer'], occasions: ['casual'], wearCount: 0, image: null },
  { id: 't4', name: 'Navy Blazer', category: 'top', color: '#2B3A55', formality: 5, pattern: 'solid', seasons: ['autumn','winter','spring'], occasions: ['office','wedding'], wearCount: 3, image: null },
  { id: 'b1', name: 'Stone Chinos', category: 'bottom', color: '#C9BBA0', formality: 3, pattern: 'solid', seasons: ['spring','summer','autumn'], occasions: ['office','casual'], wearCount: 8, image: null },
  { id: 'b2', name: 'Indigo Jeans', category: 'bottom', color: '#37516E', formality: 2, pattern: 'solid', seasons: ['spring','autumn','winter'], occasions: ['casual'], wearCount: 20, image: null },
  { id: 'b3', name: 'Charcoal Wool Trousers', category: 'bottom', color: '#3B3B3F', formality: 5, pattern: 'solid', seasons: ['autumn','winter'], occasions: ['office','wedding','winter'], wearCount: 0, image: null },
  { id: 'f1', name: 'Tan Leather Loafers', category: 'footwear', color: '#9A6B43', formality: 4, pattern: 'solid', seasons: ['spring','summer','autumn'], occasions: ['office','wedding','casual'], wearCount: 6, image: null },
  { id: 'f2', name: 'White Sneakers', category: 'footwear', color: '#EDEDE8', formality: 2, pattern: 'solid', seasons: ['spring','summer','autumn'], occasions: ['casual'], wearCount: 15, image: null },
  { id: 'f3', name: 'Black Chelsea Boots', category: 'footwear', color: '#242424', formality: 4, pattern: 'solid', seasons: ['autumn','winter'], occasions: ['office','casual','winter','wedding'], wearCount: 1, image: null },
];
