import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWardrobe } from '@/lib/WardrobeContext';
import { generateOutfits } from '@/lib/matching';
import { GarmentTile } from '@/components/fitcheck/GarmentTile';
import { colors, radii, spacing, shadow, type } from '@/constants/design';

export default function OutfitsScreen() {
  const { items } = useWardrobe();
  const outfits = generateOutfits(items);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={[type.title, styles.title]}>Today’s Outfits</Text>
      <ScrollView contentContainerStyle={styles.body}>
        {outfits.map((o) => (
          <View key={o.id} style={styles.card}>
            <View style={styles.tiles}>
              <View style={styles.tile}><GarmentTile garment={o.top} height={90} /></View>
              <View style={styles.tile}><GarmentTile garment={o.bottom} height={90} /></View>
              <View style={styles.tile}><GarmentTile garment={o.shoes} height={90} /></View>
            </View>
            <View style={styles.meta}>
              <Text style={styles.score}>{o.score}% match</Text>
              <Text style={type.label}>{o.reason}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
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
  score: { fontSize: 16, fontWeight: '800', color: colors.accent },
});
