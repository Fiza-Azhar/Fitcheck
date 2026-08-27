import { WishlistItem } from '@/interfaces/wishlist-item';
import { apiFetch } from '@/lib/apiClient';

// The wishlist the extension writes to and the app manages. Each route filters
// by the userId decoded from the bearer token. Promotion to the wardrobe ("mark
// as bought") is done in the screen via the wardrobe context's addItem, then
// removeWishlistItem here — so the wardrobe state stays in sync and the row
// only leaves the wishlist once the garment actually persisted.

export async function fetchWishlist(): Promise<WishlistItem[]> {
  return apiFetch<WishlistItem[]>('/api/wishlist');
}

export async function removeWishlistItem(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/wishlist/${id}`, { method: 'DELETE' });
}
