import { View, StyleSheet } from 'react-native';
import { OutfitFlatlayProps } from '@/interfaces/outfit-flatlay';
import { GarmentTile } from '@/components/fitcheck/GarmentTile';
import { colors, radii, spacing } from '@/constants/design';

// A loose flatlay collage of the three garments, echoing a styled layout rather
// than a uniform grid: the bottom anchors a tall left column, the top and shoes
// stack smaller on the right. Each tile reuses GarmentTile, which prefers the
// transparent cutout and falls back to the original photo.
export function OutfitFlatlay({ outfit }: OutfitFlatlayProps) {
  return (
    <View style={styles.stage}>
      <View style={styles.left}>
        <GarmentTile garment={outfit.bottom} height={210} />
      </View>
      <View style={styles.right}>
        <GarmentTile garment={outfit.top} height={outfit.shoes ? 120 : 210} />
        {outfit.shoes && <GarmentTile garment={outfit.shoes} height={82} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  left: { flex: 1.2, justifyContent: 'center' },
  right: { flex: 1, gap: spacing.sm, justifyContent: 'center' },
});
