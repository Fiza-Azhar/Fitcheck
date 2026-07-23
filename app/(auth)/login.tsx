import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthScreen } from '@/components/fitcheck/AuthScreen';
import { AuthField } from '@/components/fitcheck/AuthField';
import { useAuthSession } from '@/lib/AuthSession';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // No real auth yet: mark the session signed-in and enter the app. There is no
  // credential check to fake — that arrives with a real backend.
  const enter = () => {
    signIn();
    router.replace('/');
  };

  return (
    <AuthScreen
      title="Welcome Back"
      subtitle="Enter your details to access your sanctuary."
      primaryLabel="Sign In"
      onPrimary={enter}
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
