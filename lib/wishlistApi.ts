import { WishlistItem } from '@/interfaces/wishlist-item';
import { supabase } from '@/lib/supabase';

// The wishlist the extension writes to and the app manages. RLS scopes every
// query to the signed-in user. Promotion to the wardrobe ("mark as bought") is
// done in the screen via the wardrobe context's addItem, then removeWishlistItem
// here — so the wardrobe state stays in sync and the row only leaves the wishlist
// once the garment actually persisted.

export async function fetchWishlist(): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .order('createdAt', { ascending: false });
  if (error) throw new Error(error.message);
  return data as WishlistItem[];
}

export async function removeWishlistItem(id: string): Promise<void> {
  const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
