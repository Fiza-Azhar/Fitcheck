import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthScreenProps } from '@/interfaces/auth';
import { AuthProvider } from '@/types/auth';
import { colors, radii, shadow, spacing } from '@/constants/design';

// Shared chrome for the Sign In / Create Account screens: wordmark, title,
// subtitle, the caller's form fields, the primary action, and the "continue
// with" placeholders. Only the fields and copy differ between the two screens.
export function AuthScreen({
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  footerPrompt,
  footerLinkLabel,
  onFooterLink,
}: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.wordmark}>Fitcheck</Text>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.form}>{children}</View>

          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={onPrimary}
          >
            <Text style={styles.primaryTxt}>{primaryLabel}</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.dividerTxt}>OR CONTINUE WITH</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.socialRow}>
            <SocialButton provider="apple" />
            <SocialButton provider="google" />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerTxt}>{footerPrompt} </Text>
            <Pressable onPress={onFooterLink} hitSlop={8}>
              <Text style={styles.footerLink}>{footerLinkLabel}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PROVIDERS: Record<AuthProvider, { label: string; icon: 'logo-apple' | 'logo-google' }> = {
  apple: { label: 'Apple', icon: 'logo-apple' },
  google: { label: 'Google', icon: 'logo-google' },
};

// Visual placeholder. It is honest about not being wired rather than faking a
// sign-in — see the design system's "never fake anything" rule.
function SocialButton({ provider }: { provider: AuthProvider }) {
  const { label, icon } = PROVIDERS[provider];
  return (
    <Pressable
      style={({ pressed }) => [styles.social, pressed && styles.pressed]}
      onPress={() => Alert.alert(`${label} sign-in`, 'This option is not set up yet.')}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={styles.socialTxt}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  wordmark: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.muted,
    textAlign: 'center',
    marginTop: -spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  form: { gap: spacing.lg },
  primary: {
    backgroundColor: colors.text,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadow,
  },
  primaryTxt: { fontSize: 16, fontWeight: '700', color: colors.surface },
  pressed: { opacity: 0.7 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerTxt: { fontSize: 11, fontWeight: '600', color: colors.muted, letterSpacing: 0.5 },
  socialRow: { flexDirection: 'row', gap: spacing.md },
  social: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  socialTxt: { fontSize: 14, fontWeight: '600', color: colors.text },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerTxt: { fontSize: 14, fontWeight: '500', color: colors.muted },
  footerLink: { fontSize: 14, fontWeight: '700', color: colors.accent },
});
