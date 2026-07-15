import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWardrobe } from '@/lib/WardrobeContext';
import { Spinner } from '@/components/fitcheck/Spinner';
import { GarmentTile } from '@/components/fitcheck/GarmentTile';
import { Chip } from '@/components/fitcheck/Chip';
import { Garment } from '@/interfaces/garment';
import { AddPhase } from '@/types/add-item';
import { colors, radii, spacing, shadow, type } from '@/constants/design';

const SUGGESTED: Omit<Garment, 'id'> = {
  name: 'Rust Corduroy Overshirt', category: 'top', color: '#B5643C', formality: 3,
  pattern: 'solid', seasons: ['autumn', 'winter'], occasions: ['casual', 'office'], wearCount: 0, image: null,
};

export default function AddScreen() {
  const { addItem } = useWardrobe();
  const [phase, setPhase] = useState<AddPhase>('idle');

  const analyse = () => { setPhase('analysing'); setTimeout(() => setPhase('ready'), 1500); };
  const save = () => { addItem(SUGGESTED); setPhase('idle'); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={[type.title, styles.title]}>Add Item</Text>
      <ScrollView contentContainerStyle={styles.body}>
        {phase === 'idle' && (
          <Pressable style={styles.upload} onPress={analyse}>
            <Text style={styles.plus}>＋</Text>
            <Text style={type.label}>Click to add photo</Text>
          </Pressable>
        )}
        {phase === 'analysing' && <Spinner />}
        {phase === 'ready' && (
          <View style={styles.form}>
            <GarmentTile garment={{ ...SUGGESTED, id: 'preview' }} height={160} />
            <Text style={type.h2}>{SUGGESTED.name}</Text>
            <View style={styles.rowChips}>
              <Chip label={SUGGESTED.category} />
              <Chip label={SUGGESTED.pattern} swatch={SUGGESTED.color} />
              <Chip label={`Formality ${SUGGESTED.formality}/5`} />
              {SUGGESTED.seasons.map((s) => <Chip key={s} label={s} />)}
            </View>
            <Pressable style={styles.save} onPress={save}><Text style={styles.saveTxt}>Save to wardrobe</Text></Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  body: { padding: spacing.lg, gap: spacing.lg },
  upload: { height: 220, borderRadius: radii.lg, borderWidth: 2, borderColor: colors.accentSoft, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surface },
  plus: { fontSize: 44, color: colors.accent },
  form: { gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, ...shadow },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  save: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
