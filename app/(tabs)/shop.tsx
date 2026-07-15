import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWardrobe } from '@/lib/WardrobeContext';
import { shopMatches } from '@/lib/matching';
import { MatchBadge } from '@/components/fitcheck/MatchBadge';
import { ShopVariant } from '@/types/shop';
import { Garment } from '@/interfaces/garment';
import { colors, radii, spacing, shadow, type } from '@/constants/design';

const PRODUCT: Garment = {
  id: 'shop1', name: 'Terracotta Knit Polo', category: 'top', color: '#C56B4A', formality: 3,
  pattern: 'solid', seasons: ['spring', 'autumn'], occasions: ['office', 'casual'], wearCount: 0, image: null,
};

export default function ShopScreen() {
  const { items } = useWardrobe();
  const [variant, setVariant] = useState<ShopVariant>('goes');
  const matches = shopMatches(items, 'office');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={[type.title, styles.title]}>Shop Check</Text>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.product}>
          <View style={[styles.hero, { backgroundColor: PRODUCT.color }]}>
            <Text style={styles.heroTxt}>{PRODUCT.name}</Text>
          </View>
          <Text style={type.h2}>{PRODUCT.name}</Text>
          <Text style={styles.price}>$68.00</Text>
          <Pressable style={styles.cart}><Text style={styles.cartTxt}>Add to cart</Text></Pressable>
        </View>

        <View style={styles.floating}>
          <MatchBadge variant={variant} count={variant === 'goes' ? matches.length : 3} thumbnails={matches} />
        </View>

        <View style={styles.toggleRow}>
          <Pressable onPress={() => setVariant('goes')} style={[styles.toggle, variant === 'goes' && styles.toggleOn]}>
            <Text style={[styles.toggleTxt, variant === 'goes' && styles.toggleTxtOn]}>Goes with</Text>
          </Pressable>
          <Pressable onPress={() => setVariant('similar')} style={[styles.toggle, variant === 'similar' && styles.toggleOn]}>
            <Text style={[styles.toggleTxt, variant === 'similar' && styles.toggleTxtOn]}>Already own</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  body: { padding: spacing.lg, gap: spacing.lg },
  product: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, ...shadow },
  hero: { height: 240, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  heroTxt: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  price: { fontSize: 18, fontWeight: '800', color: colors.text },
  cart: { backgroundColor: colors.text, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  cartTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  floating: { marginTop: -spacing.xxl, marginHorizontal: spacing.sm },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: radii.pill, padding: 4 },
  toggle: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill },
  toggleOn: { backgroundColor: colors.accent },
  toggleTxt: { fontWeight: '700', color: colors.muted },
  toggleTxtOn: { color: '#FFFFFF' },
});
