import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthSession } from '@/lib/AuthSession';
import { colors } from '@/constants/design';

export default function TabLayout() {
  const { session, loading } = useAuthSession();

  // Wait for the persisted session to be restored before deciding, so an
  // already-signed-in user never sees the login screen flash on cold start.
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // No session → send them to the login screen first.
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        // Otherwise Android's adjustResize rides the tab bar up on top of the
        // keyboard while typing in the Add Item form. Chosen over app.json's
        // softwareKeyboardLayoutMode: "pan", which would break keyboard-controller
        // — it requires adjustResize.
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Wardrobe', tabBarIcon: ({ color, size }) => <Ionicons name="shirt-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="add" options={{ title: 'Add', tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="outfits" options={{ title: 'Outfits', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop Check', tabBarIcon: ({ color, size }) => <Ionicons name="pricetag-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
