import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWardrobe } from '@/lib/WardrobeContext';
import { filterByOccasion } from '@/lib/filtering';
import { FilterKey } from '@/types/filter';
import { FilterTabs } from '@/components/fitcheck/FilterTabs';
import { GarmentCard } from '@/components/fitcheck/GarmentCard';
import { colors, spacing, type } from '@/constants/design';

export default function WardrobeScreen() {
  const { items } = useWardrobe();
  const [filter, setFilter] = useState<FilterKey>('all');
  const shown = filterByOccasion(items, filter);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={[type.title, styles.title]}>My Wardrobe</Text>
      <FilterTabs value={filter} onChange={setFilter} />
      <ScrollView contentContainerStyle={styles.grid}>
        {shown.map((g) => (
          <View key={g.id} style={styles.cell}><GarmentCard garment={g} /></View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  cell: { width: '47%', flexGrow: 1 },
});
