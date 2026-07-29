import { View, Text, Pressable, StyleSheet } from 'react-native';
import { EmptyStateProps } from '@/interfaces/empty-state';
import { button, colors, radii, spacing, type } from '@/constants/design';

// One component for "nothing here yet" and "something broke", because the two
// must never be confused on screen — an unreachable server used to look exactly
// like an empty wardrobe.
export function EmptyState({ icon, title, message, actionLabel, onAction, tone = 'neutral' }: EmptyStateProps) {
  const error = tone === 'error';
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconRing, error && styles.iconRingError]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[type.h2, styles.title]}>{title}</Text>
      <Text style={[type.label, styles.message]}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionTxt}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  iconRing: {
    width: 72, height: 72, borderRadius: radii.pill, backgroundColor: colors.chip,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  iconRingError: { backgroundColor: colors.warnBg },
  icon: { fontSize: 30 },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', maxWidth: 280, lineHeight: 19 },
  action: {
    marginTop: spacing.md, backgroundColor: button.primaryBg, borderRadius: radii.pill,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  actionPressed: { opacity: 0.85 },
  actionTxt: { color: button.primaryTxt, fontWeight: '700', fontSize: 15 },
});
