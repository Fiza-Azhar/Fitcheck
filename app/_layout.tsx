// Hermes (native) has no built-in URL global; lib/shopChecks.ts's productKey()
// depends on `new URL(...)`. This used to load transitively via lib/supabase.ts
// — now that Supabase is gone, it needs its own home, and it must run before
// anything else does.
import 'react-native-url-polyfill/auto';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthSessionProvider } from '@/lib/AuthSession';
import { WardrobeProvider } from '@/lib/WardrobeContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    // Outermost on purpose: react-native-gesture-handler requires a root view
    // above everything that uses a gesture, and the Shop tab's swipe-to-delete
    // rows silently do nothing without it. flex:1 so it fills the window rather
    // than collapsing to its content.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* Wraps every screen so the auth and Add Item forms can track the keyboard
            frame-by-frame. No statusBarTranslucent/navigationBarTranslucent here on
            purpose: the provider ORs those with its own edge-to-edge detection, which
            reads the native flag our app.json `edgeToEdgeEnabled: true` already sets.
            Hardcoding them would go stale the moment edge-to-edge is turned off. */}
        <KeyboardProvider>
          <AuthSessionProvider>
            <WardrobeProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <StatusBar style="auto" />
            </WardrobeProvider>
          </AuthSessionProvider>
        </KeyboardProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
