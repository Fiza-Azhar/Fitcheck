import { View, Text, StyleSheet } from 'react-native';
import { ChipProps } from '@/interfaces/chip';
import { colors, radii, spacing, type } from '@/constants/design';

export function Chip({ label, swatch }: ChipProps) {
  return (
    <View style={styles.chip}>
      {swatch ? <View style={[styles.swatch, { backgroundColor: swatch }]} /> : null}
      <Text style={type.chip}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.chip, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4, gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.hairline },
});
