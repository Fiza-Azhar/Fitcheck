import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthScreen } from '@/components/fitcheck/AuthScreen';
import { AuthField } from '@/components/fitcheck/AuthField';
import { useAuthSession } from '@/lib/AuthSession';
import { authErrorMessage } from '@/lib/authErrors';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const enter = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (e) {
      // Failure stays visible: show the reason, do not enter the app.
      setError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title="Welcome Back"
      subtitle="Enter your details to access your sanctuary."
      primaryLabel="Sign In"
      onPrimary={enter}
      error={error}
      submitting={submitting}
      footerPrompt="New to Fitcheck?"
      footerLinkLabel="Create an Account"
      onFooterLink={() => router.push('/signup')}
    >
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
        actionLabel="Forgot Password?"
      />
    </AuthScreen>
  );
}
