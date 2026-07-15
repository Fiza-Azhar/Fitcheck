import { View, Text, StyleSheet } from 'react-native';
import { WearBadgeProps } from '@/interfaces/wear-badge';
import { colors, radii, spacing } from '@/constants/design';

export function WearBadge({ count }: WearBadgeProps) {
  if (count === 0) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
        <Text style={[styles.txt, { color: colors.accent }]}>Not worn yet</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: colors.surface }]}>
      <Text style={[styles.txt, { color: colors.muted }]}>Worn {count}×</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  txt: { fontSize: 11, fontWeight: '700' },
});
