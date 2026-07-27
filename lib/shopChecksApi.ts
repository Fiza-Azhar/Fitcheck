import { ShopCheck } from '@/interfaces/shop-check';
import { supabase } from '@/lib/supabase';

// Reads the shopping checks the extension logged. Talks straight to Supabase with
// the anon key; RLS returns only the signed-in user's rows, so this is the same
// account whose wardrobe the extension compared against. Failures throw — an
// empty feed is a real state, a broken query is not.
export async function fetchRecentChecks(limit = 40): Promise<ShopCheck[]> {
  const { data, error } = await supabase
    .from('shop_checks')
    .select('*')
    .order('checkedAt', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as ShopCheck[];
}
