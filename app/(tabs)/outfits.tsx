import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWardrobe } from '@/lib/WardrobeContext';
import { getOutfits } from '@/lib/ai';
import { GetOutfitsResult } from '@/interfaces/ai';
import { GarmentTile } from '@/components/fitcheck/GarmentTile';
import { Spinner } from '@/components/fitcheck/Spinner';
import { colors, radii, spacing, shadow, type } from '@/constants/design';

export default function OutfitsScreen() {
  const { items } = useWardrobe();
  const [result, setResult] = useState<GetOutfitsResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    getOutfits(items).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const ai = result?.source === 'ai';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={[type.title, styles.title]}>Today&apos;s Outfits</Text>
      {result === null ? (
        <Spinner label="Asking AI for outfit ideas…" />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {result.outfits.map((o) => (
            <View key={o.id} style={styles.card}>
              <View style={styles.tiles}>
                <View style={styles.tile}><GarmentTile garment={o.top} height={90} /></View>
                <View style={styles.tile}><GarmentTile garment={o.bottom} height={90} /></View>
                <View style={styles.tile}><GarmentTile garment={o.shoes} height={90} /></View>
              </View>
              <View style={styles.meta}>
                <View style={styles.metaRow}>
                  <Text style={styles.score}>{o.score}% match</Text>
                  <Text style={[styles.badge, ai ? styles.badgeAi : styles.badgeDummy]}>
                    {ai ? 'AI-powered' : 'Prototype match'}
                  </Text>
                </View>
                <Text style={type.label}>{o.reason}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  body: { padding: spacing.lg, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.md, ...shadow },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1 },
  meta: { gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  score: { fontSize: 16, fontWeight: '800', color: colors.accent },
  badge: { fontSize: 11, fontWeight: '700', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, overflow: 'hidden' },
  badgeAi: { color: colors.accent, backgroundColor: colors.accentSoft },
  badgeDummy: { color: colors.muted, backgroundColor: colors.chip },
});
