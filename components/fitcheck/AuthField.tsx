import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AuthFieldProps } from '@/interfaces/auth';
import { colors, radii, spacing, type } from '@/constants/design';

// Long enough to read as a deliberate transition, short enough that it never
// lags behind a fast tap between fields.
const FOCUS_MS = 180;

// A labeled text input used by the auth screens. Handles its own show/hide
// state for password fields so the screens stay declarative, and animates its
// border and label on focus.
export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
  autoCapitalize,
  actionLabel,
  onAction,
  ref,
  returnKeyType,
  onSubmitEditing,
  autoComplete,
  textContentType,
}: AuthFieldProps) {
  const [hidden, setHidden] = useState(true);
  const focus = useSharedValue(0);

  // Colour is animated, never border *width*: changing width would relayout the
  // row on every focus change and reintroduce the jitter this screen is meant to
  // be rid of. borderWidth stays pinned at 1 in the static style below.
  const wrapStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.border, colors.accentDeep]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(focus.value, [0, 1], [colors.muted, colors.accentDeep]),
  }));

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Animated.Text style={[type.label, labelStyle]}>{label}</Animated.Text>
        {actionLabel ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      <Animated.View style={[styles.inputWrap, wrapStyle]}>
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secure ? hidden : false}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          // Mid-chain fields must not dismiss the keyboard on Return, or every
          // "next" would close and reopen it.
          submitBehavior={returnKeyType === 'next' ? 'submit' : 'blurAndSubmit'}
          autoComplete={autoComplete}
          textContentType={textContentType}
          onFocus={() => {
            focus.value = withTiming(1, { duration: FOCUS_MS });
          }}
          onBlur={() => {
            focus.value = withTiming(0, { duration: FOCUS_MS });
          }}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8} style={styles.eye}>
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  action: { fontSize: 13, fontWeight: '600', color: colors.accentDeep },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, paddingVertical: spacing.md, fontSize: 15, fontWeight: '600', color: colors.text },
  eye: { paddingLeft: spacing.sm },
});
