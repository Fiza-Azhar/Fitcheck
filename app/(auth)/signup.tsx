import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthScreen } from '@/components/fitcheck/AuthScreen';
import { AuthField } from '@/components/fitcheck/AuthField';
import { useAuthSession } from '@/lib/AuthSession';
import { authErrorMessage } from '@/lib/authErrors';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuthSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const enter = async () => {
    if (submitting) return;
    setError(null);
    // Confirm-match is a client-side check the backend can't make for us.
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      // Email confirmation is disabled for the demo, so signUp yields a live
      // session immediately and the tab gate lets us in.
      router.replace('/');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title="Create Account"
      subtitle="Start building your digital wardrobe."
      primaryLabel="Create Account"
      onPrimary={enter}
      error={error}
      submitting={submitting}
      footerPrompt="Already have an account?"
      footerLinkLabel="Sign In"
      onFooterLink={() => router.push('/login')}
    >
      <AuthField
        label="Full Name"
        value={name}
        onChangeText={setName}
        placeholder="Alex Morgan"
        autoCapitalize="words"
      />
      <AuthField
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        placeholder="alex@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secure
      />
      <AuthField
        label="Confirm Password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="••••••••"
        secure
      />
    </AuthScreen>
  );
}
