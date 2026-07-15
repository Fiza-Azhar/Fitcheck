import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { FilterTabsProps } from '@/interfaces/filter-tabs';
import { FILTERS } from '@/lib/data';
import { colors, radii, spacing } from '@/constants/design';

export function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {FILTERS.map((f) => {
        const active = f.key === value;
        return (
          <Pressable key={f.key} onPress={() => onChange(f.key)} style={[styles.tab, active && styles.active]}>
            <Text style={[styles.txt, active && styles.activeTxt]}>{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surface },
  active: { backgroundColor: colors.accent },
  txt: { fontSize: 14, fontWeight: '600', color: colors.muted },
  activeTxt: { color: '#FFFFFF' },
});
