import { Text, Pressable, StyleSheet } from 'react-native';
import { OptionPillProps } from '@/interfaces/option-pill';
import { button, colors, radii, spacing } from '@/constants/design';

// Chip is display-only; this is its selectable sibling, used wherever the user
// corrects what the AI guessed.
export function OptionPill({ label, selected, onPress }: OptionPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, selected && styles.pillOn, pressed && styles.pressed]}
    >
      <Text style={[styles.txt, selected && styles.txtOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: button.neutralBg, borderWidth: 1, borderColor: button.outline,
  },
  pillOn: { backgroundColor: button.primaryBg, borderColor: button.primaryBg },
  pressed: { opacity: 0.7 },
  txt: { fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'capitalize' },
  txtOn: { color: button.primaryTxt },
});
