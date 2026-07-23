import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { FilterTabsProps } from '@/interfaces/filter-tabs';
import { FILTERS } from '@/lib/data';
import { colors, radii, spacing } from '@/constants/design';

export function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {FILTERS.map((f) => {
        const active = f.key === value;
        return (
          <Pressable key={f.key} onPress={() => onChange(f.key)} style={[styles.tab, active && styles.active]}>
            <Text style={[styles.txt, active && styles.activeTxt]} numberOfLines={1}>{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { flexGrow: 0, alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  tab: { height: 34, paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: colors.accent },
  txt: { fontSize: 14, lineHeight: 18, fontWeight: '600', color: colors.muted, includeFontPadding: false },
  activeTxt: { color: '#FFFFFF' },
});
