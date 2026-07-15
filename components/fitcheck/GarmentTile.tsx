import { View, Text, StyleSheet } from 'react-native';
import { GarmentTileProps } from '@/interfaces/garment-tile';
import { radii, spacing } from '@/constants/design';

function isLight(hex: string) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

export function GarmentTile({ garment, height = 120 }: GarmentTileProps) {
  const light = isLight(garment.color);
  return (
    <View style={[styles.tile, { backgroundColor: garment.color, height }]}>
      <Text style={[styles.label, { color: light ? '#2E2A26' : '#FFFFFF' }]} numberOfLines={2}>
        {garment.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radii.md, padding: spacing.md, justifyContent: 'flex-end', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  label: { fontSize: 13, fontWeight: '700' },
});
