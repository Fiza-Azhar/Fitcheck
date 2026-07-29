import { Modal, View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { PhotoSourceSheetProps } from '@/interfaces/photo-source-sheet';
import { colors, radii, spacing, shadow, type } from '@/constants/design';
import { images } from '@/constants/assets';

export function PhotoSourceSheet({ visible, onSelect, onCancel }: PhotoSourceSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={[type.h2, styles.title]}>Add a photo</Text>
          <Pressable style={styles.option} onPress={() => onSelect('camera')}>
            <Image source={images.camera} style={styles.icon} resizeMode="contain" />
            <Text style={type.body}>Take Photo</Text>
          </Pressable>
          <Pressable style={styles.option} onPress={() => onSelect('gallery')}>
            <Image source={images.gallery} style={styles.icon} resizeMode="contain" />
            <Text style={type.body}>Choose from Gallery</Text>
          </Pressable>
          <Pressable style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelTxt}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm, ...shadow },
  handle: { width: 40, height: 4, borderRadius: radii.pill, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.sm },
  title: { textAlign: 'center', marginBottom: spacing.xs },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.bg },
  icon: { width: 26, height: 26 },
  cancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  cancelTxt: { fontWeight: '700', color: colors.muted, fontSize: 15 },
});
