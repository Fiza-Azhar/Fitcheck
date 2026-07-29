import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWardrobe } from '@/lib/WardrobeContext';
import { getOutfits } from '@/lib/ai';
import { Outfit } from '@/interfaces/outfit';
import { LoadState } from '@/types/load-state';
import { Occasion } from '@/types/garment';
import { OCCASIONS } from '@/constants/garment';
import { OutfitFlatlay } from '@/components/fitcheck/OutfitFlatlay';
import { OptionPill } from '@/components/fitcheck/OptionPill';
import { Spinner } from '@/components/fitcheck/Spinner';
import { EmptyState } from '@/components/fitcheck/EmptyState';
import { colors, radii, spacing, shadow, type } from '@/constants/design';

// The stylist needs a top and a bottom to build anything. Shoes are optional —
// added to an outfit only when the wardrobe has footwear.
function hasEnoughItems(categories: Set<string>): boolean {
  return categories.has('top') && categories.has('bottom');
}

export default function OutfitsScreen() {
  const { items, state: wardrobeState } = useWardrobe();
  const router = useRouter();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  // Which occasion to style for. Undefined = general suggestions.
  const [occasion, setOccasion] = useState<Occasion | undefined>(undefined);

  const enough = hasEnoughItems(new Set(items.map((g) => g.category)));

  const load = useCallback(async () => {
    if (!enough) return;
    setState('loading');
    setError(null);
    try {
      setOutfits(await getOutfits(items, occasion));
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The stylist is unavailable right now.');
      setState('error');
    }
  }, [items, enough, occasion]);

  useEffect(() => {
    void load();
  }, [load]);

  // Tapping the selected chip clears it, returning to general suggestions.
  const pick = (o: Occasion) => setOccasion((prev) => (prev === o ? undefined : o));

  const header = (
    <View style={styles.header}>
      <Text style={type.title}>Today&apos;s Outfits</Text>
      {enough && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {OCCASIONS.map((o) => (
            <OptionPill key={o} label={o} selected={occasion === o} onPress={() => pick(o)} />
          ))}
        </ScrollView>
      )}
    </View>
  );

  const body = () => {
    if (wardrobeState === 'loading') return <Spinner label="Opening your wardrobe…" />;
    if (!enough) {
      return (
        <EmptyState
          icon="🧩"
          title="Not enough to work with"
          message="Add at least one top and one bottom, and the stylist can start putting outfits together. Shoes are optional."
          actionLabel="Add an item"
          onAction={() => router.push('/add')}
        />
      );
    }
    if (state === 'loading') return <Spinner label="Asking the stylist…" />;
    if (state === 'error') {
      return (
        <EmptyState
          tone="error"
          icon="⚠"
          title="No suggestions right now"
          message={error ?? 'The stylist is unavailable.'}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      );
    }
    return (
      <ScrollView contentContainerStyle={styles.body}>
        {outfits.map((o) => (
          <View key={o.id} style={styles.card}>
            <OutfitFlatlay outfit={o} />
            <View style={styles.meta}>
              <Text style={type.h2}>{o.name}</Text>
              <Text style={styles.score}>{o.score}% match</Text>
              <Text style={type.label}>{o.reason}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header}
      {body()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  chips: { gap: spacing.sm, paddingBottom: spacing.xs },
  body: { padding: spacing.lg, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.md, ...shadow },
  meta: { gap: 2 },
  score: { fontSize: 16, fontWeight: '800', color: colors.accentDeep },
});
