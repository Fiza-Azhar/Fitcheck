import { View, Text, Image, StyleSheet } from 'react-native';
import { GarmentTileProps } from '@/interfaces/garment-tile';
import { colors, radii, spacing } from '@/constants/design';

function isLight(hex: string) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

export function GarmentTile({ garment, height = 150 }: GarmentTileProps) {
  // Prefer the transparent cutout; fall back to the original photo when the
  // background-removal sidecar wasn't available for this item.
  const photoUri = garment.cutoutUrl ?? garment.imageUrl;
  if (photoUri) {
    return (
      <View style={[styles.tile, styles.photoTile, { height }]}>
        <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />
      </View>
    );
  }
  const light = isLight(garment.color);
  return (
    <View style={[styles.tile, { backgroundColor: garment.color, height }]}>
      <Text style={[styles.label, { color: light ? colors.text : '#FFFFFF' }]} numberOfLines={2}>
        {garment.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radii.md, padding: spacing.md, justifyContent: 'flex-end', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', overflow: 'hidden' },
  photoTile: { backgroundColor: colors.chip, padding: spacing.sm, justifyContent: 'center', alignItems: 'center' },
  photo: { width: '100%', height: '100%' },
  label: { fontSize: 13, fontWeight: '700' },
});
