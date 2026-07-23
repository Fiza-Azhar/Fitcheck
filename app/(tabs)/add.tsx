import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { useWardrobe } from '@/lib/WardrobeContext';
import { analyzeItemPhoto, emptyDraft } from '@/lib/itemAnalysis';
import { Spinner } from '@/components/fitcheck/Spinner';
import { GarmentTile } from '@/components/fitcheck/GarmentTile';
import { OptionPill } from '@/components/fitcheck/OptionPill';
import { EmptyState } from '@/components/fitcheck/EmptyState';
import { PhotoSourceSheet } from '@/components/fitcheck/PhotoSourceSheet';
import { GarmentDraft } from '@/interfaces/garment';
import { AddPhase } from '@/types/add-item';
import { PhotoSource } from '@/types/photo-source';
import { Formality } from '@/types/garment';
import { CATEGORIES, OCCASIONS, SEASONS } from '@/constants/garment';
import { colors, radii, spacing, shadow, type } from '@/constants/design';

const FORMALITY_LABELS = ['Very casual', 'Casual', 'Smart', 'Formal', 'Black tie'];

// Full-resolution phone photos are 3000–4000px and several MB — large enough to
// exceed the server's 4MB image cap and to time out background removal. A garment
// only needs ~1600px, so we downscale wide photos and always re-encode as a
// modest-quality JPEG before upload. Browser test images were already small,
// which is why cutouts only failed on real devices.
const MAX_DIMENSION = 1600;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

async function preparePhoto(
  uri: string,
  width?: number,
): Promise<{ uri: string; base64: string } | null> {
  try {
    const context = ImageManipulator.manipulate(uri);
    if (width && width > MAX_DIMENSION) context.resize({ width: MAX_DIMENSION });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, base64: true, compress: 0.7 });
    return result.base64 ? { uri: result.uri, base64: result.base64 } : null;
  } catch {
    return null;
  }
}

export default function AddScreen() {
  const { addItem } = useWardrobe();
  const router = useRouter();
  const [phase, setPhase] = useState<AddPhase>('idle');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [draft, setDraft] = useState<GarmentDraft>(emptyDraft());
  const [aiFailed, setAiFailed] = useState(false);
  const [removeBg, setRemoveBg] = useState(true);

  const reset = useCallback(() => {
    setPhase('idle');
    setPhotoUri(null);
    setPhotoBase64(null);
    setDraft(emptyDraft());
    setAiFailed(false);
    setRemoveBg(true);
  }, []);

  // Tab screens stay mounted, so without this the phase (form, spinner, etc.)
  // persists and returning to the tab hides the "add photo" button behind a stale
  // half-finished capture. Leaving the tab abandons that capture and restores the
  // idle state, so the add button is always there on return. Native pickers open
  // as OS activities (not navigation), so this does not fire mid-capture.
  useFocusEffect(
    useCallback(() => {
      return () => reset();
    }, [reset]),
  );

  const analyse = async (base64: string) => {
    setPhase('analysing');
    setAiFailed(false);
    try {
      const result = await analyzeItemPhoto(base64);
      if (result.status === 'not_garment') {
        // The model positively says this isn't clothing — block the save.
        setPhase('rejected');
        return;
      }
      setDraft(result.draft);
    } catch {
      // The photo is still good — let the user describe it by hand rather than
      // throwing away their capture.
      setDraft(emptyDraft());
      setAiFailed(true);
    }
    setPhase('ready');
  };

  const pickSource = async (source: PhotoSource) => {
    setPickerOpen(false);

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        source === 'camera' ? 'Camera access needed' : 'Photo access needed',
        `Enable ${source === 'camera' ? 'camera' : 'photo library'} permission for Fitcheck in your device settings.`,
      );
      return;
    }

    // Resize/re-encode ourselves below, so we don't ask ImagePicker for base64
    // of the full-resolution original — that's the payload we need to shrink.
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) {
      Alert.alert('Could not read that photo', 'Try taking it again.');
      return;
    }

    const prepared = await preparePhoto(asset.uri, asset.width);
    if (!prepared) {
      Alert.alert('Could not read that photo', 'Try taking it again.');
      return;
    }

    setPhotoUri(prepared.uri);
    setPhotoBase64(prepared.base64);
    await analyse(prepared.base64);
  };

  const canSave =
    draft.name.trim().length > 0 && draft.seasons.length > 0 && draft.occasions.length > 0;

  const save = async () => {
    if (!canSave) return;
    setPhase('saving');
    try {
      await addItem({ ...draft, name: draft.name.trim() }, photoBase64 ?? undefined, removeBg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      router.push('/');
    } catch (e) {
      setPhase('ready');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Could not save',
        e instanceof Error ? e.message : 'The item was not saved. Is the server running?',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={[type.title, styles.title]}>Add Item</Text>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {phase === 'idle' && (
          <Pressable style={styles.upload} onPress={() => setPickerOpen(true)}>
            <Text style={styles.plus}>＋</Text>
            <Text style={type.label}>Click to add photo</Text>
          </Pressable>
        )}

        {phase === 'analysing' && <Spinner label="Looking at your photo…" />}

        {phase === 'rejected' && (
          <EmptyState
            tone="error"
            icon="👕"
            title="That doesn't look like clothing"
            message="Fitcheck only stores tops, bottoms and footwear. Take a photo of a single clothing item and try again."
            actionLabel="Take another photo"
            onAction={reset}
          />
        )}

        {(phase === 'ready' || phase === 'saving') && (
          <View style={styles.form}>
            <GarmentTile
              garment={{ ...draft, id: 'preview', wearCount: 0, imageUrl: photoUri, cutoutUrl: null }}
              height={200}
            />

            {aiFailed && (
              <View style={styles.notice}>
                <Text style={styles.noticeTxt}>
                  Couldn&apos;t analyse this photo, so the details below are blank. Fill them in, or discard and retake.
                </Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={type.label}>Background</Text>
              <View style={styles.pills}>
                <OptionPill label="Remove" selected={removeBg} onPress={() => setRemoveBg(true)} />
                <OptionPill label="Keep original" selected={!removeBg} onPress={() => setRemoveBg(false)} />
              </View>
              <Text style={type.label}>
                {removeBg
                  ? 'The photo background will be removed for a clean cutout.'
                  : 'The photo will be kept exactly as taken.'}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={type.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={draft.name}
                onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
                placeholder="e.g. Navy Wool Blazer"
                placeholderTextColor={colors.muted}
                maxLength={60}
              />
            </View>

            <View style={styles.field}>
              <Text style={type.label}>Category</Text>
              <View style={styles.pills}>
                {CATEGORIES.map((c) => (
                  <OptionPill
                    key={c}
                    label={c}
                    selected={draft.category === c}
                    onPress={() => setDraft((d) => ({ ...d, category: c }))}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={type.label}>Pattern</Text>
              <TextInput
                style={styles.input}
                value={draft.pattern}
                onChangeText={(pattern) => setDraft((d) => ({ ...d, pattern }))}
                placeholder="e.g. solid"
                placeholderTextColor={colors.muted}
                maxLength={60}
              />
            </View>

            <View style={styles.field}>
              <Text style={type.label}>Colour</Text>
              <View style={styles.colorRow}>
                <View style={[styles.swatch, { backgroundColor: draft.color }]} />
                <Text style={type.body}>{draft.color}</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={type.label}>Formality</Text>
              <View style={styles.pills}>
                {FORMALITY_LABELS.map((label, i) => (
                  <OptionPill
                    key={label}
                    label={label}
                    selected={draft.formality === i + 1}
                    onPress={() => setDraft((d) => ({ ...d, formality: (i + 1) as Formality }))}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={type.label}>Seasons</Text>
              <View style={styles.pills}>
                {SEASONS.map((s) => (
                  <OptionPill
                    key={s}
                    label={s}
                    selected={draft.seasons.includes(s)}
                    onPress={() => setDraft((d) => ({ ...d, seasons: toggle(d.seasons, s) }))}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={type.label}>Occasions</Text>
              <View style={styles.pills}>
                {OCCASIONS.map((o) => (
                  <OptionPill
                    key={o}
                    label={o}
                    selected={draft.occasions.includes(o)}
                    onPress={() => setDraft((d) => ({ ...d, occasions: toggle(d.occasions, o) }))}
                  />
                ))}
              </View>
            </View>

            {!canSave && (
              <Text style={styles.hint}>Add a name, at least one season and one occasion to save.</Text>
            )}

            <Pressable
              style={[styles.save, (!canSave || phase === 'saving') && styles.saveOff]}
              onPress={() => void save()}
              disabled={!canSave || phase === 'saving'}
            >
              <Text style={styles.saveTxt}>{phase === 'saving' ? 'Saving…' : 'Save to wardrobe'}</Text>
            </Pressable>

            <Pressable style={styles.retake} onPress={reset} disabled={phase === 'saving'}>
              <Text style={styles.retakeTxt}>Discard and retake</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <PhotoSourceSheet
        visible={pickerOpen}
        onSelect={(s) => void pickSource(s)}
        onCancel={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  body: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  upload: {
    height: 220, borderRadius: radii.lg, borderWidth: 2, borderStyle: 'dashed',
    borderColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.surface,
  },
  plus: { fontSize: 44, color: colors.accent },
  form: { gap: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, ...shadow },
  notice: { backgroundColor: colors.warnBg, borderRadius: radii.md, padding: spacing.md },
  noticeTxt: { fontSize: 13, fontWeight: '600', color: colors.warn, lineHeight: 18 },
  field: { gap: spacing.sm },
  input: {
    backgroundColor: colors.bg, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 15, fontWeight: '600', color: colors.text,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  swatch: { width: 36, height: 36, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border },
  hint: { ...type.label, textAlign: 'center' },
  save: { backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
  saveOff: { opacity: 0.4 },
  saveTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  retake: { alignItems: 'center', paddingVertical: spacing.sm },
  retakeTxt: { ...type.label, textDecorationLine: 'underline' },
});
