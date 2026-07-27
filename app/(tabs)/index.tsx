import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { confirmAction, notify } from '@/lib/confirm';
import { useAuthSession } from '@/lib/AuthSession';
import { useWardrobe } from '@/lib/WardrobeContext';
import { filterByOccasion } from '@/lib/filtering';
import { FilterKey } from '@/types/filter';
import { Garment } from '@/interfaces/garment';
import { FilterTabs } from '@/components/fitcheck/FilterTabs';
import { GarmentCard } from '@/components/fitcheck/GarmentCard';
import { EmptyState } from '@/components/fitcheck/EmptyState';
import { Spinner } from '@/components/fitcheck/Spinner';
import { colors, spacing, type } from '@/constants/design';

export default function WardrobeScreen() {
  const { items, state, error, reload, removeItem } = useWardrobe();
  const { signOut } = useAuthSession();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');

  // On sign-out the tab gate re-renders with a null session and redirects to
  // /login, so there is nothing to navigate here. A failure stays visible.
  // confirmAction (not Alert) so the dialog and its action work on web too.
  const confirmSignOut = () => {
    void confirmAction('Sign out', 'Sign out of Fitcheck?', 'Sign out').then((ok) => {
      if (ok) signOut().catch(() => notify('Could not sign out', 'Please try again.'));
    });
  };

  const confirmDelete = (g: Garment) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove item', `Remove “${g.name}” from your wardrobe?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeItem(g.id).catch(() =>
            Alert.alert('Could not remove', 'The item is still there — check the server is running.'),
          );
        },
      },
    ]);
  };

  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onSignOut={confirmSignOut} />
        <Spinner label="Opening your wardrobe…" />
      </SafeAreaView>
    );
  }

  if (state === 'error') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onSignOut={confirmSignOut} />
        <EmptyState
          tone="error"
          icon="⚠"
          title="Can't reach your wardrobe"
          message={error ?? 'The server is not responding. Make sure it is running, then try again.'}
          actionLabel="Try again"
          onAction={() => void reload()}
        />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onSignOut={confirmSignOut} />
        <EmptyState
          icon="👕"
          title="Your wardrobe is empty"
          message="Photograph a garment and it gets identified, described and saved automatically."
          actionLabel="Add your first item"
          onAction={() => router.push('/add')}
        />
      </SafeAreaView>
    );
  }

  const shown = filterByOccasion(items, filter);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header onSignOut={confirmSignOut} />
      <FilterTabs value={filter} onChange={setFilter} />
      {shown.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Nothing for this occasion"
          message="None of your items are tagged for this occasion yet. Try another filter."
          actionLabel="Show all items"
          onAction={() => setFilter('all')}
        />
      ) : (
        <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid}>
          {shown.map((g) => (
            <Pressable
              key={g.id}
              style={styles.cell}
              onLongPress={() => confirmDelete(g)}
              delayLongPress={400}
            >
              <GarmentCard garment={g} />
            </Pressable>
          ))}
          <Text style={styles.hint}>Long-press an item to remove it</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// Title row shared by every state of the screen, with a sign-out control on the
// right so the account is reachable from the wardrobe's home.
function Header({ onSignOut }: { onSignOut: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={type.title}>Fitcheck</Text>
      <Pressable onPress={onSignOut} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
        <Ionicons name="log-out-outline" size={24} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  gridScroll: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  // No flexGrow: a lone item on the last row must stay at column width, not
  // stretch to fill the row.
  cell: { width: '47%' },
  hint: { ...type.label, width: '100%', textAlign: 'center', marginTop: spacing.md },
});
