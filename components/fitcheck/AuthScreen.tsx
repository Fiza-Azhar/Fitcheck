import { View, Text, Image, Pressable, Alert, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthScreenProps } from '@/interfaces/auth';
import { AuthProvider } from '@/types/auth';
import { button, colors, radii, shadow, spacing } from '@/constants/design';
import { images } from '@/constants/assets';

// Shared chrome for the Sign In / Create Account screens: logo, title,
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
  error,
  submitting,
}: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Replaces a KeyboardAvoidingView whose Android behavior was `undefined` —
          i.e. it did nothing, leaving the window resize to jump the centred form
          to a new position in one step. This view's default mode="insets" makes
          room for the keyboard through content insets instead of relaying out, so
          content height never changes, styles.scroll can keep its vertical
          centring, and the library animates scroll offset in sync with the
          keyboard on both platforms. */}
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        // Keeps the focused field clear of the keyboard rather than flush to it.
        bottomOffset={spacing.xl}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* The asset is the full lockup — mark, wordmark and tagline — so it
            replaces the text wordmark rather than sitting next to it. */}
        <Image
          source={images.logo}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Fitcheck"
        />

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.form}>{children}</View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.primary, (pressed || submitting) && styles.pressed]}
          onPress={onPrimary}
          disabled={submitting}
        >
          <Text style={styles.primaryTxt}>{submitting ? 'Please wait…' : primaryLabel}</Text>
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
      </KeyboardAwareScrollView>
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
      <Ionicons name={icon} size={18} color={button.secondaryTxt} />
      <Text style={styles.socialTxt}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  // Square asset, so width tracks height; the art carries its own padding, which
  // is why the surrounding gap looks generous at this size.
  logo: { width: 150, height: 150, alignSelf: 'center', marginBottom: -spacing.md },
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
    backgroundColor: button.primaryBg,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadow,
  },
  primaryTxt: { fontSize: 16, fontWeight: '700', color: button.primaryTxt },
  pressed: { opacity: 0.7 },
  error: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warn,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
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
    backgroundColor: button.secondaryBg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: button.outline,
    paddingVertical: spacing.md,
  },
  socialTxt: { fontSize: 14, fontWeight: '600', color: button.secondaryTxt },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerTxt: { fontSize: 14, fontWeight: '500', color: colors.muted },
  footerLink: { fontSize: 14, fontWeight: '700', color: colors.accentDeep },
});
