import { ReactNode, Ref } from 'react';
import { KeyboardTypeOptions, TextInput, TextInputProps } from 'react-native';

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
  // Forwarded to the inner TextInput so a screen can build a focus chain
  // (Email → Password → submit). React 19 passes `ref` as an ordinary prop to
  // function components, so AuthField needs no forwardRef.
  ref?: Ref<TextInput>;
  // "next" advances to the next field and keeps the keyboard up; "go"/"done"
  // ends the chain. See onSubmitEditing.
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  // Lets password managers recognise the field. Without these, autofill can't
  // see the email/password inputs at all.
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
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
  // from the auth API.
  error?: string | null;
  // While true the primary action is disabled and shows a submitting label, so a
  // double-tap can't fire two sign-in requests.
  submitting?: boolean;
}
