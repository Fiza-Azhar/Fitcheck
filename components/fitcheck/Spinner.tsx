import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SpinnerProps } from '@/interfaces/spinner';
import { colors, spacing, type } from '@/constants/design';

export function Spinner({ label = 'AI is analysing…' }: SpinnerProps) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.accentDeep} size="large" />
      <Text style={[type.label, { marginTop: spacing.md }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
});
