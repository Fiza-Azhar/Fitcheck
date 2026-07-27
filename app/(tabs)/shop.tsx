import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { confirmAction, notify } from '@/lib/confirm';
import { useWardrobe } from '@/lib/WardrobeContext';
import { fetchRecentChecks } from '@/lib/shopChecksApi';
import { fetchWishlist, removeWishlistItem } from '@/lib/wishlistApi';
import { ShopCheck } from '@/interfaces/shop-check';
import { WishlistItem } from '@/interfaces/wishlist-item';
import { EmptyState } from '@/components/fitcheck/EmptyState';
import { Spinner } from '@/components/fitcheck/Spinner';
import { LoadState } from '@/types/load-state';
import { colors, radii, spacing, shadow, type } from '@/constants/design';

// The Shop tab is the phone side of the browser extension: the extension checks
// products and saves candidates while you shop, and this screen shows that
// activity — a feed of recent checks and a wishlist you can act on. Both read the
// same Supabase account the extension writes to, scoped by RLS.

type Tab = 'checks' | 'wishlist';

export default function ShopScreen() {
  const { addItem } = useWardrobe();
  const [tab, setTab] = useState<Tab>('checks');

  const [checks, setChecks] = useState<ShopCheck[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  // Every wishlist item currently mid-action. A Set (not a single id) so that
  // finishing one item's action can't re-enable another item's still-running one.
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const markBusy = (id: string) => setBusyIds((prev) => new Set(prev).add(id));
  const clearBusy = (id: string) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const load = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const [c, w] = await Promise.all([fetchRecentChecks(), fetchWishlist()]);
      setChecks(c);
      setWishlist(w);
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your shopping activity.');
      setState('error');
    }
  }, []);

  // Reload every time the tab gains focus, so a product you just checked or saved
  // in the browser shows up when you switch back to the app.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const buy = (item: WishlistItem) => {
    void confirmAction('Add to wardrobe', `Move “${item.name}” into your wardrobe as owned?`, 'Add').then(
      async (ok) => {
        if (!ok) return;
        markBusy(item.id);
        try {
          // Promote to a real garment first; only drop it from the wishlist once
          // that persisted, so a failure never loses the saved item.
          await addItem({
            name: item.name,
            category: item.category,
            color: item.color,
            formality: item.formality,
            pattern: item.pattern,
            seasons: item.seasons,
            occasions: item.occasions,
          });
          await removeWishlistItem(item.id);
          setWishlist((prev) => prev.filter((w) => w.id !== item.id));
        } catch {
          notify('Could not add', 'The item is still in your wishlist — try again.');
        } finally {
          clearBusy(item.id);
        }
      },
    );
  };

  const remove = (item: WishlistItem) => {
    void confirmAction('Remove', `Remove “${item.name}” from your wishlist?`, 'Remove').then(async (ok) => {
      if (!ok) return;
      markBusy(item.id);
      try {
        await removeWishlistItem(item.id);
        setWishlist((prev) => prev.filter((w) => w.id !== item.id));
      } catch {
        notify('Could not remove', 'Please try again.');
      } finally {
        clearBusy(item.id);
      }
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={[type.title, styles.title]}>Shop Check</Text>

      <View style={styles.tabsRow}>
        <TabButton label="Recently checked" active={tab === 'checks'} onPress={() => setTab('checks')} />
        <TabButton label={`Wishlist${wishlist.length ? ` (${wishlist.length})` : ''}`} active={tab === 'wishlist'} onPress={() => setTab('wishlist')} />
      </View>

      {state === 'loading' ? (
        <Spinner label="Loading your shopping activity…" />
      ) : state === 'error' ? (
        <EmptyState
          tone="error"
          icon="⚠"
          title="Can't load your activity"
          message={error ?? 'The server is not responding. Try again.'}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : tab === 'checks' ? (
        <ChecksList checks={checks} />
      ) : (
        <WishlistList wishlist={wishlist} busyIds={busyIds} onBuy={buy} onRemove={remove} />
      )}
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabOn]}>
      <Text style={[styles.tabTxt, active && styles.tabTxtOn]}>{label}</Text>
    </Pressable>
  );
}

// --- Recently checked ----------------------------------------------------------

function ChecksList({ checks }: { checks: ShopCheck[] }) {
  if (checks.length === 0) {
    return (
      <EmptyState
        icon="🛍️"
        title="No checks yet"
        message="Open a clothing product on a shopping site with the FitCheck browser extension, and it appears here."
      />
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {checks.map((c) => (
        <Pressable
          key={c.id}
          style={styles.row}
          onPress={() => c.productUrl && Linking.openURL(c.productUrl)}
        >
          <Thumb uri={c.imageUrl} color={c.color} />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={2}>{c.title}</Text>
            <View style={styles.metaRow}>
              <VerdictPill check={c} />
              {c.price ? <Text style={styles.price}>{c.price}</Text> : null}
            </View>
            <Text style={styles.time}>{timeAgo(c.checkedAt)}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function VerdictPill({ check }: { check: ShopCheck }) {
  const map = {
    similar: { bg: colors.warnBg, fg: colors.warn, text: `⚠ Own ${check.alreadyOwnCount} similar` },
    goes: { bg: colors.successBg, fg: colors.success, text: `✓ Goes with ${check.goesWithCount}` },
    fresh: { bg: colors.chip, fg: colors.muted, text: '✦ Fresh find' },
    not_garment: { bg: colors.chip, fg: colors.muted, text: 'Not clothing' },
  }[check.verdict];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      <Text style={[styles.pillTxt, { color: map.fg }]}>{map.text}</Text>
    </View>
  );
}

// --- Wishlist ------------------------------------------------------------------

function WishlistList({
  wishlist,
  busyIds,
  onBuy,
  onRemove,
}: {
  wishlist: WishlistItem[];
  busyIds: Set<string>;
  onBuy: (i: WishlistItem) => void;
  onRemove: (i: WishlistItem) => void;
}) {
  if (wishlist.length === 0) {
    return (
      <EmptyState
        icon="♡"
        title="Your wishlist is empty"
        message="While shopping, tap “Save to FitCheck” on the extension badge to keep an item here to consider."
      />
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {wishlist.map((item) => {
        const busy = busyIds.has(item.id);
        return (
          <View key={item.id} style={styles.row}>
            <Thumb uri={item.imageUrl} color={item.color} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={2}>{item.name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.category}>{item.category}</Text>
                {item.price ? <Text style={styles.price}>{item.price}</Text> : null}
              </View>
              <View style={styles.actions}>
                <Pressable disabled={busy} onPress={() => onBuy(item)} style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}>
                  <Text style={styles.btnPrimaryTxt}>Mark as bought</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => onRemove(item)} style={[styles.btn, styles.btnGhost, busy && styles.btnDisabled]}>
                  <Text style={styles.btnGhostTxt}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// --- Shared bits ---------------------------------------------------------------

function Thumb({ uri, color }: { uri: string | null; color: string | null }) {
  if (uri) return <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />;
  return <View style={[styles.thumb, { backgroundColor: color ?? colors.chip }]} />;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: 4,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill },
  tabOn: { backgroundColor: colors.accent },
  tabTxt: { fontWeight: '700', color: colors.muted, fontSize: 13 },
  tabTxtOn: { color: '#FFFFFF' },

  list: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, ...shadow },
  thumb: { width: 64, height: 80, borderRadius: radii.md, backgroundColor: colors.chip },
  rowBody: { flex: 1, gap: spacing.xs, justifyContent: 'center' },
  rowTitle: { ...type.body, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  price: { fontSize: 13, fontWeight: '800', color: colors.text },
  category: { fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'capitalize' },
  time: { fontSize: 12, color: colors.muted },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill },
  pillTxt: { fontSize: 12, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md },
  btnPrimary: { backgroundColor: colors.text },
  btnPrimaryTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnGhostTxt: { color: colors.text, fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
});
