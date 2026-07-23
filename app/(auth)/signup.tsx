import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthScreen } from '@/components/fitcheck/AuthScreen';
import { AuthField } from '@/components/fitcheck/AuthField';
import { useAuthSession } from '@/lib/AuthSession';

export default function SignupScreen() {
  const router = useRouter();
  const { signIn } = useAuthSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // No real auth yet: mark the session signed-in and enter the app.
  const enter = () => {
    signIn();
    router.replace('/');
  };

  return (
    <AuthScreen
      title="Create Account"
      subtitle="Start building your digital wardrobe."
      primaryLabel="Create Account"
      onPrimary={enter}
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
