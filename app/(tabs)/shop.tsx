import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Image, Linking } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { confirmAction, notify } from '@/lib/confirm';
import { useWardrobe } from '@/lib/WardrobeContext';
import { deleteChecksForProduct, fetchRecentChecks } from '@/lib/shopChecksApi';
import { fetchWishlist, removeWishlistItem } from '@/lib/wishlistApi';
import { fetchRemoteImageBase64 } from '@/lib/remoteImage';
import { CheckRowProps } from '@/interfaces/check-row';
import { ChecksListProps } from '@/interfaces/checks-list';
import { ShopCheck } from '@/interfaces/shop-check';
import { ShopCheckGroup } from '@/interfaces/shop-check-group';
import { WishlistItem } from '@/interfaces/wishlist-item';
import { EmptyState } from '@/components/fitcheck/EmptyState';
import { Spinner } from '@/components/fitcheck/Spinner';
import { LoadState } from '@/types/load-state';
import { button, colors, radii, spacing, shadow, type } from '@/constants/design';

// The Shop tab is the phone side of the browser extension: the extension checks
// products and saves candidates while you shop, and this screen shows that
// activity — a feed of recent checks and a wishlist you can act on. Both read the
// same Supabase account the extension writes to, scoped by RLS.

type Tab = 'checks' | 'wishlist';

export default function ShopScreen() {
  const { addItem } = useWardrobe();
  const [tab, setTab] = useState<Tab>('checks');

  const [checks, setChecks] = useState<ShopCheckGroup[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  // Every row currently mid-action, across both tabs — wishlist items by their
  // own id, checked products by their newest check's id. A Set (not a single id)
  // so that finishing one item's action can't re-enable another's still-running
  // one. The two tabs never render at once, so the shared set can't collide
  // visually even in the unlikely event two ids matched.
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
          // Carry the product photo across, so the wardrobe tile shows the
          // garment instead of falling back to a flat colour block the way it
          // does for any item saved without an image. Null just means the
          // merchant image wouldn't download — the purchase still goes through.
          const imageBase64 = item.imageUrl ? await fetchRemoteImageBase64(item.imageUrl) : null;
          // Promote to a real garment first; only drop it from the wishlist once
          // that persisted, so a failure never loses the saved item.
          await addItem(
            {
              name: item.name,
              category: item.category,
              color: item.color,
              formality: item.formality,
              pattern: item.pattern,
              seasons: item.seasons,
              occasions: item.occasions,
            },
            imageBase64 ?? undefined,
          );
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

  // Swipe-to-delete on a "Recently checked" row. One row stands for every time
  // that product was checked, so this clears the whole group — deleting only the
  // newest row would let an older one take its place on the very next load and
  // read as "delete didn't work".
  const deleteCheck = (group: ShopCheckGroup) => {
    const { id } = group.check;
    markBusy(id);
    // Database first, local state only once it confirms — the same rule the
    // wardrobe follows, so what's on screen is always something that persisted.
    deleteChecksForProduct(group.urls)
      .then(() => setChecks((prev) => prev.filter((g) => g.check.id !== id)))
      .catch(() => notify('Could not remove', 'The item is still in your history — please try again.'))
      .finally(() => clearBusy(id));
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
        <ChecksList checks={checks} busyIds={busyIds} onDelete={deleteCheck} />
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

function ChecksList({ checks, busyIds, onDelete }: ChecksListProps) {
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
      {checks.map((group) => (
        <CheckRow
          key={group.check.id}
          group={group}
          busy={busyIds.has(group.check.id)}
          onDelete={() => onDelete(group)}
        />
      ))}
      <Text style={styles.hint}>Swipe a row left to remove it</Text>
    </ScrollView>
  );
}

// A checked product, swipeable to reveal Delete. The swipe plus the deliberate
// tap on the revealed action is the confirmation — no dialog on top, unlike the
// wardrobe's long-press delete, where the gesture is easy to trigger by accident
// and the item being destroyed is a real garment rather than a history entry.
function CheckRow({ group, busy, onDelete }: CheckRowProps) {
  const { check } = group;
  return (
    <ReanimatedSwipeable
      // Clips the action panel to the card's own corner radius so it doesn't
      // square off the row while sliding.
      containerStyle={styles.swipeContainer}
      friction={2}
      rightThreshold={40}
      // A second swipe mid-delete would fire another delete for the same rows.
      enabled={!busy}
      renderRightActions={() => (
        <Pressable
          onPress={onDelete}
          disabled={busy}
          style={[styles.swipeAction, busy && styles.btnDisabled]}
        >
          <Text style={styles.swipeActionTxt}>{busy ? 'Removing…' : 'Delete'}</Text>
        </Pressable>
      )}
    >
      <Pressable
        style={styles.row}
        onPress={() => check.productUrl && Linking.openURL(check.productUrl)}
      >
        <Thumb uri={check.imageUrl} color={check.color} />
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={2}>{check.title}</Text>
          <View style={styles.metaRow}>
            <VerdictPill check={check} />
            {check.price ? <Text style={styles.price}>{check.price}</Text> : null}
          </View>
          <Text style={styles.time}>{timeAgo(check.checkedAt)}</Text>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
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
  tabOn: { backgroundColor: button.primaryBg },
  tabTxt: { fontWeight: '700', color: colors.muted, fontSize: 13 },
  tabTxtOn: { color: button.primaryTxt },

  list: { padding: spacing.lg, gap: spacing.md },
  // The swipeable wrapper owns the corner radius and clips the action panel; the
  // row keeps its own radius so it still looks right when not being swiped.
  swipeContainer: { borderRadius: radii.lg, overflow: 'hidden' },
  swipeAction: {
    backgroundColor: button.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  swipeActionTxt: { color: button.dangerTxt, fontWeight: '700', fontSize: 14 },
  hint: { ...type.label, textAlign: 'center', marginTop: spacing.xs },
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
  btnPrimary: { backgroundColor: button.primaryBg },
  btnPrimaryTxt: { color: button.primaryTxt, fontWeight: '700', fontSize: 13 },
  btnGhost: { backgroundColor: button.secondaryBg, borderWidth: 1, borderColor: button.outline },
  btnGhostTxt: { color: button.secondaryTxt, fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
});
