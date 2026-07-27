import { ReactNode } from 'react';
import { KeyboardTypeOptions, TextInputProps } from 'react-native';

export interface AuthFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  // When true, renders a masked input with an eye toggle to reveal the text.
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  // Optional right-aligned link on the label row, e.g. "Forgot Password?".
  actionLabel?: string;
  onAction?: () => void;
}

export interface AuthScreenProps {
  title: string;
  subtitle: string;
  // The form fields for this screen (AuthField instances).
  children: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  // Footer prompt + link that toggles between Sign In and Create Account.
  footerPrompt: string;
  footerLinkLabel: string;
  onFooterLink: () => void;
  // Inline auth error (wrong password, email taken, network). Rendered above the
  // primary button; null/undefined hides the row. Never faked — comes straight
  // from Supabase.
  error?: string | null;
  // While true the primary action is disabled and shows a submitting label, so a
  // double-tap can't fire two sign-in requests.
  submitting?: boolean;
}
