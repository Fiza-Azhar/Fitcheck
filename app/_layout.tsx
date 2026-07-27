import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
  );
}
