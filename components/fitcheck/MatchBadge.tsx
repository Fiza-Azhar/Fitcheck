import { View, Text, StyleSheet } from 'react-native';
import { MatchBadgeProps } from '@/interfaces/match-badge';
import { colors, radii, spacing, shadow } from '@/constants/design';
import { GarmentTile } from './GarmentTile';

export function MatchBadge({ variant, count, thumbnails }: MatchBadgeProps) {
  const goes = variant === 'goes';
  return (
    <View style={[styles.box, { backgroundColor: goes ? colors.successBg : colors.warnBg, borderColor: goes ? colors.success : colors.warn }]}>
      <Text style={[styles.head, { color: goes ? colors.success : colors.warn }]}>
        {goes ? `✓ Goes with ${count} items you already own` : `⚠ You already own ${count} similar items`}
      </Text>
      <View style={styles.thumbs}>
        {thumbnails.slice(0, 3).map((g) => (
          <View key={g.id} style={styles.thumb}><GarmentTile garment={g} height={56} /></View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radii.lg, borderWidth: 1.5, padding: spacing.lg, gap: spacing.md, ...shadow },
  head: { fontSize: 15, fontWeight: '800' },
  thumbs: { flexDirection: 'row', gap: spacing.sm },
  thumb: { flex: 1 },
});
