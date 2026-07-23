import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthSession } from '@/lib/AuthSession';
import { colors } from '@/constants/design';

export default function TabLayout() {
  const { signedIn } = useAuthSession();

  // Not signed in this run → send them to the login screen first.
  if (!signedIn) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Wardrobe', tabBarIcon: ({ color, size }) => <Ionicons name="shirt-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="add" options={{ title: 'Add', tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="outfits" options={{ title: 'Outfits', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop Check', tabBarIcon: ({ color, size }) => <Ionicons name="pricetag-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
