import { View, Text, StyleSheet } from 'react-native';
import { GarmentCardProps } from '@/interfaces/garment-card';
import { colors, radii, spacing, shadow, type } from '@/constants/design';
import { GarmentTile } from './GarmentTile';
import { Chip } from './Chip';
import { WearBadge } from './WearBadge';

const FORMALITY = ['', 'Very casual', 'Casual', 'Smart', 'Formal', 'Black tie'];

export function GarmentCard({ garment }: GarmentCardProps) {
  return (
    <View style={styles.card}>
      <GarmentTile garment={garment} />
      <View style={styles.body}>
        <Text style={type.body} numberOfLines={1}>{garment.name}</Text>
        <View style={styles.chips}>
          <Chip label={garment.pattern} swatch={garment.color} />
          <Chip label={FORMALITY[garment.formality]} />
        </View>
        <WearBadge count={garment.wearCount} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.sm, ...shadow },
  body: { paddingHorizontal: spacing.xs, paddingTop: spacing.sm, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
