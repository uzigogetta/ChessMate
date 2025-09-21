import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, Platform, useColorScheme, SectionList, RefreshControl, TextInput, Share, ActionSheetIOS } from 'react-native';
import { Card, Text, Chip, Button } from '@/ui/atoms';
import { init, listGames, type GameRow, listFavorites, addFavorite, removeFavorite, deleteGame, addFavorites, removeFavorites } from '@/archive/db';
import { Link, Stack, useRouter, useFocusEffect } from 'expo-router';
import { isUploaded } from '@/shared/cloud';
import { themes, ThemeName } from '@/ui/tokens';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSettings } from '@/features/settings/settings.store';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { dynamicColor } from '@/theme/dynamic';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from 'react-native';
// import { useHeaderHeight } from '@react-navigation/elements';

export default function ArchiveListScreen() {
  const [items, setItems] = useState<GameRow[]>([]);
  const listRef = useRef<SectionList<GameRow> | null>(null);
  const router = useRouter();
  const sys = useColorScheme();
  const settings = useSettings();
  const mode = settings.theme as 'system'|'light'|'dark';
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];
  const highContrast = settings.highContrast;
  const reduceMotion = settings.reduceMotion;
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all'|'online'|'local'|'ai'>('all');
  // Removed iOS18 spacer logic to keep header permanently compact
  const [resultFilter, setResultFilter] = useState<'any'|'1-0'|'0-1'|'1/2-1/2'>('any');
  const [refreshing, setRefreshing] = useState(false);
  const [favs, setFavs] = useState<string[]>([]);
  const [sort, setSort] = useState<'new'|'old'|'moves'>('new');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<GameRow[] | null>(null);
  const undoTimerRef = useRef<any>(null);

  const summarySV = useSharedValue(0);
  const selectSV = useSharedValue(0);
  const undoSV = useSharedValue(0);

  // const headerHeight = useHeaderHeight();

  const fetchData = useCallback(async () => {
    try {
      await init();
      const rows = await listGames({ mode: modeFilter, result: resultFilter, sort, favoritesOnly, query });
      const f = await listFavorites();
      setItems(rows);
      setFavs(f);
    } catch {}
  }, [modeFilter, resultFilter, sort, favoritesOnly, query]);

  useFocusEffect(React.useCallback(() => { fetchData(); }, [fetchData]));
  useEffect(() => { fetchData(); }, [fetchData]);

  const sections = useMemo(() => {
    const map = new Map<string, GameRow[]>();
    const favSet = new Set(favs);
    const favItems: GameRow[] = [];
    for (const g of items) {
      if (!favoritesOnly && favSet.has(g.id)) { favItems.push(g); continue; }
      const d = new Date(g.createdAt);
      const key = formatDayKey(d);
      const arr = map.get(key) || [];
      arr.push(g); map.set(key, arr);
    }
    const out: { title: string; data: GameRow[] }[] = [];
    if (!favoritesOnly && favItems.length > 0) out.push({ title: 'Favorites', data: favItems });
    out.push(...Array.from(map.entries()).map(([title, data]) => ({ title, data })));
    return out;
  }, [items, favs, favoritesOnly]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }, [fetchData]);

  useEffect(() => { const next = showSummary ? 1 : 0; summarySV.value = reduceMotion ? next : withSpring(next, { damping: 18, stiffness: 200 }); }, [showSummary, reduceMotion]);
  useEffect(() => { const next = selectMode ? 1 : 0; selectSV.value = reduceMotion ? next : withSpring(next, { damping: 18, stiffness: 200 }); }, [selectMode, reduceMotion]);
  useEffect(() => { const next = pendingDelete ? 1 : 0; undoSV.value = reduceMotion ? next : withSpring(next, { damping: 18, stiffness: 200 }); }, [pendingDelete, reduceMotion]);

  const summaryStyle = useAnimatedStyle(() => ({ opacity: summarySV.value, transform: [{ translateY: (1 - summarySV.value) * 12 }] }));
  const selectStyle = useAnimatedStyle(() => ({ opacity: selectSV.value, transform: [{ translateY: (1 - selectSV.value) * 40 }] }));
  const undoStyle = useAnimatedStyle(() => ({ opacity: undoSV.value, transform: [{ translateY: (1 - undoSV.value) * 16 }] }));

  const ListHeaderContent = () => (
    <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', gap: 12, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text muted style={{ fontSize: 13 }}>{items.length} {items.length === 1 ? 'result' : 'results'}</Text>
        <Chip label={selectMode ? 'Cancel' : 'Select'} selected={selectMode} onPress={() => { setSelectMode((v) => !v); setSelected(new Set()); Haptics.selectionAsync(); }} />
      </View>
    </View>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 6 }}>
      <Text muted style={{ fontSize: 13 }}>{section.title}</Text>
    </View>
  );

  const toggleFavorite = useCallback(async (id: string) => {
    try {
      setFavs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
      const current = await listFavorites();
      if (current.includes(id)) await removeFavorite(id); else await addFavorite(id);
      Haptics.selectionAsync();
    } catch {}
  }, []);

  const scheduleDelete = useCallback((rows: GameRow[]) => {
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    setItems((prev) => prev.filter((g) => !rows.some((r) => r.id === g.id)));
    setFavs((prev) => prev.filter((id) => !rows.some((r) => r.id === id)));
    setPendingDelete(rows);
    undoTimerRef.current = setTimeout(async () => {
      try { for (const r of rows) await deleteGame(r.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setPendingDelete(null); undoTimerRef.current = null;
    }, 3500);
  }, []);

  const shareOne = useCallback(async (g: GameRow) => { try { await Share.share({ message: g.pgn, title: `${g.whiteName || 'White'} vs ${g.blackName || 'Black'}` }); } catch {} }, []);

  const presentRowActions = useCallback((g: GameRow) => {
    const isFav = favs.includes(g.id);
    const options = ['Share PGN', 'Copy PGN', isFav ? 'Unfavorite' : 'Favorite', 'Delete', 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: 4, destructiveButtonIndex: 3, userInterfaceStyle: active === 'dark' ? 'dark' : 'light' },
      async (idx) => {
        if (idx === 0) shareOne(g);
        else if (idx === 1) { try { await Clipboard.setStringAsync(g.pgn); Haptics.selectionAsync(); } catch {} }
        else if (idx === 2) toggleFavorite(g.id);
        else if (idx === 3) scheduleDelete([g]);
      }
    );
  }, [favs, active, shareOne, toggleFavorite, scheduleDelete]);

  const renderItem = ({ item: g }: { item: GameRow }) => {
    const isSelected = selectMode && selected.has(g.id);
    const inner = (
      <RectButton onLongPress={() => (selectMode ? setSelected((prev) => { const next = new Set(prev); if (next.has(g.id)) next.delete(g.id); else next.add(g.id); return next; }) : presentRowActions(g))} onPress={() => { if (selectMode) setSelected((prev) => { const next = new Set(prev); if (next.has(g.id)) next.delete(g.id); else next.add(g.id); return next; }); }}>
        <Card style={{ paddingVertical: 12, paddingHorizontal: 14, borderWidth: isSelected ? 2 : 0, borderColor: isSelected ? c.primary : 'transparent' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 16 }}>{`${g.whiteName || 'White'} vs ${g.blackName || 'Black'}`}</Text>
              <Text muted style={{ fontSize: 13 }}>{`${new Date(g.createdAt).toLocaleString()} • ${g.mode} • ${g.moves} moves`}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {favs.includes(g.id) && (<Badge label="★" tint={tintWithAlpha(c.accent as any, 0.2, active)} textColor={c.text as any} />)}
              <Badge label={resultShort(g.result)} tint={badgeTintForResult(g.result, c, active)} textColor={badgeTextColor(active)} />
              {isUploaded(g.id) && (<Badge label="☁︎" tint={cloudBadgeTint(c, active, highContrast)} textColor={c.text as any} />)}
            </View>
          </View>
        </Card>
      </RectButton>
    );
    const wrapped = selectMode ? inner : (<Link href={`/archive/${g.id}`} asChild>{inner}</Link>);
    return (
      <Swipeable enabled={!selectMode} friction={2} rightThreshold={40} onSwipeableWillOpen={() => Haptics.selectionAsync()}
        renderRightActions={() => (
          <View style={{ flexDirection: 'row', alignItems: 'center', height: '100%' }}>
            <ActionChip label="Share" color={c.primary} onPress={() => shareOne(g)} />
            <ActionChip label={favs.includes(g.id) ? 'Unfavorite' : 'Favorite'} color={c.accent} onPress={() => toggleFavorite(g.id)} />
            <ActionChip label="Delete" color="#FF453A" onPress={() => scheduleDelete([g])} />
          </View>
        )}
        renderLeftActions={() => (
          <View style={{ flexDirection: 'row', alignItems: 'center', height: '100%' }}>
            <ActionChip label={favs.includes(g.id) ? 'Unfavorite' : 'Favorite'} color={c.accent} onPress={() => toggleFavorite(g.id)} />
          </View>
        )}
        overshootRight={false}
      >{wrapped}</Swipeable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Archive',
          headerLargeTitle: true,
          headerRight: () => (
            <Pressable onPress={() => setShowFilters(true)}>
              <View style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <BlurView intensity={25} tint={active} style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="filter" size={20} color={c.primary} />
                </BlurView>
              </View>
            </Pressable>
          ),
          headerSearchBarOptions: {
            placement: 'stacked',
            hideWhenScrolling: true,
            obscuresBackgroundDuringPresentation: false,
            placeholder: 'Search players',
            onChangeText: (e: any) => setQuery(e.nativeEvent.text),
            onCancelButtonPress: () => setQuery(''),
          } as any,
        }}
      />
      <SectionList
        ref={listRef as any}
        sections={sections}
        keyExtractor={(g) => String(g.id)}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        ListHeaderComponent={<ListHeaderContent />}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 12 }}
        style={{ flex: 1, backgroundColor: c.background }}
        scrollsToTop
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustsScrollIndicatorInsets={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.muted} />}
        stickySectionHeadersEnabled
        keyboardDismissMode={'on-drag'}
        onScroll={(e) => { const y = e.nativeEvent.contentOffset.y; setShowSummary(y > 12); }}
        scrollEventThrottle={16}
        ListEmptyComponent={
          items.length === 0 ? (
            <EmptyState title="No Games Saved" message="Your completed games will appear here." cta="Play a Game" onCtaPress={() => router.push('/(tabs)/play')} />
          ) : (
            <EmptyState title="No Results" message="No games match your current filters." cta="Clear Filters" onCtaPress={() => { setQuery(''); setModeFilter('all'); setResultFilter('any'); setFavoritesOnly(false); setSort('new'); Haptics.selectionAsync(); }} />
          )
        }
      />
      <FilterSheet visible={showFilters} onClose={() => setShowFilters(false)}
        filters={{ mode: modeFilter, result: resultFilter, sort, favoritesOnly }}
        setters={{ setMode: setModeFilter, setResult: setResultFilter, setSort, setFavoritesOnly }}
      />

      <Animated.View pointerEvents={showSummary ? 'auto' : 'none'} style={[{ position: 'absolute', bottom: 24, alignSelf: 'center' }, summaryStyle]}>
        <FilterSummaryPill uiTint={active} c={c} text={buildSummaryText({ query, modeFilter, resultFilter, sort, favoritesOnly })} onPress={() => (listRef.current as any)?.scrollToOffset?.({ offset: 0, animated: true })} />
      </Animated.View>

      {pendingDelete && (
        <Animated.View style={[{ position: 'absolute', bottom: 24, left: 12, right: 12 }, undoStyle]}>
          <UndoBar uiTint={active} c={c} count={pendingDelete.length} onUndo={() => {
            if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
            setItems((prev) => [...prev, ...pendingDelete]);
            setPendingDelete(null);
          }} />
        </Animated.View>
      )}

      <Animated.View pointerEvents={selectMode ? 'auto' : 'none'} style={[{ position: 'absolute', left: 0, right: 0, bottom: 0 }, selectStyle]}>
        {selectMode && (
          <SelectionBar uiTint={active} c={c} selectedCount={selected.size}
            onFavorite={async () => { const ids = Array.from(selected); await addFavorites(ids); setFavs((prev) => [...new Set([...prev, ...ids])]); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setSelectMode(false); setSelected(new Set()); }}
            onUnfavorite={async () => { const ids = Array.from(selected); await removeFavorites(ids); setFavs((prev) => prev.filter((id) => !ids.includes(id))); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setSelectMode(false); setSelected(new Set()); }}
            onShare={async () => { const rows = items.filter((g) => selected.has(g.id)); try { await Share.share({ message: rows.map((r) => r.pgn).join('\n\n') }); } catch {} }}
            onDelete={() => { const rows = items.filter((g) => selected.has(g.id)); setSelectMode(false); setSelected(new Set()); scheduleDelete(rows); }}
            onCancel={() => { setSelectMode(false); setSelected(new Set()); }}
          />
        )}
      </Animated.View>
    </>
  );
}

function SearchBar({ value, onChange, tint, uiTint }: { value: string; onChange: (v: string) => void; tint: any; uiTint: ThemeName }) {
  const inner = (
    <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
      <TextInput value={value} onChangeText={onChange} placeholder="Search players" placeholderTextColor={tint.muted} style={{ color: tint.text, fontSize: 16 }} clearButtonMode="while-editing" autoCorrect={false} autoCapitalize="none" />
    </View>
  );
  return (
    <View style={{ overflow: 'hidden', borderRadius: 12 }}>
      <BlurView intensity={40} tint={uiTint === 'dark' ? 'dark' : 'light'} style={{ borderRadius: 12, overflow: 'hidden' }}>{inner}</BlurView>
    </View>
  );
}

function ActionChip({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}><View style={{ backgroundColor: tintWithAlpha(color, 0.2), borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginHorizontal: 4 }}><Text style={{ color: color, fontSize: 12 }}>{label}</Text></View></Pressable>
  );
}

function formatDayKey(d: Date) {
  const today = new Date();
  const isSame = d.toDateString() === today.toDateString();
  if (isSame) return 'Today';
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  try { return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' } as any); } catch { return d.toDateString(); }
}

function labelResultChip(k: 'any'|'1-0'|'0-1'|'1/2-1/2') { if (k === 'any') return 'Any result'; if (k === '1-0') return '1-0'; if (k === '0-1') return '0-1'; return '½-½'; }
function resultShort(r: string) { if (r === '1/2-1/2' || r === '1/2') return '½'; return r; }
function tintWithAlpha(color: any, alpha: number, ui?: ThemeName) { if (typeof color === 'string' && color.startsWith('#')) { const { r, g, b } = hexToRgb(color); return `rgba(${r}, ${g}, ${b}, ${alpha})`; } return `rgba(${ui === 'dark' ? 242 : 28}, ${ui === 'dark' ? 242 : 28}, ${ui === 'dark' ? 247 : 30}, ${alpha})`; }
function hexToRgb(hex: string) { const h = hex.replace('#',''); const bigint = parseInt(h,16); return { r:(bigint>>16)&255, g:(bigint>>8)&255, b:bigint&255 }; }
function badgeTintForResult(result: string, c: { primary: any; accent: any; muted: any }, ui: ThemeName) { if (result === '1-0') return ui === 'dark' ? 'rgba(48,209,88,0.24)' : 'rgba(48,209,88,0.22)'; if (result === '0-1') return ui === 'dark' ? 'rgba(10,132,255,0.24)' : 'rgba(10,132,255,0.22)'; return ui === 'dark' ? 'rgba(99,99,102,0.22)' : 'rgba(120,120,128,0.18)'; }
function Badge({ label, tint, textColor }: { label: string; tint: string; textColor: string }) { return (<View style={{ backgroundColor: tint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 12, color: textColor }}>{label}</Text></View>); }
function badgeTextColor(theme: ThemeName) { return theme === 'dark' ? '#FFFFFF' : '#0B0B0D'; }
function cloudBadgeTint(c: { primary: any }, ui: ThemeName, highContrast: boolean) { return dynamicColor('rgba(10,132,255,0.18)', 'rgba(10,132,255,0.22)', ui); }

function FilterSummaryPill({ uiTint, c, text, onPress }: { uiTint: ThemeName; c: any; text: string; onPress: () => void }) {
  const pill = (<Pressable onPress={onPress}><View style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: tintWithAlpha(c.card, 0.65) }}><Text style={{ color: c.text, fontSize: 13 }}>{text}</Text></View></Pressable>);
  return (<BlurView intensity={40} tint={uiTint === 'dark' ? 'dark' : 'light'} style={{ borderRadius: 999, overflow: 'hidden' }}>{pill}</BlurView>);
}

function buildSummaryText({ query, modeFilter, resultFilter, sort, favoritesOnly }: any) {
  const bits: string[] = [];
  if (favoritesOnly) bits.push('Favorites');
  if (modeFilter !== 'all') bits.push(modeFilter === 'ai' ? 'AI' : modeFilter === 'local' ? 'Local' : 'Online');
  if (resultFilter !== 'any') bits.push(resultFilter === '1/2-1/2' ? 'Draw' : resultFilter);
  bits.push(sort === 'new' ? 'Newest' : sort === 'old' ? 'Oldest' : 'Moves');
  if (query) bits.push(`“${query}”`);
  return bits.join(' • ');
}

function SelectionBar({ uiTint, c, selectedCount, onShare, onDelete, onCancel, onFavorite, onUnfavorite }: { uiTint: ThemeName; c: any; selectedCount: number; onShare: () => void; onDelete: () => void; onCancel: () => void; onFavorite: () => void; onUnfavorite: () => void; }) {
  return (
    <View style={{ padding: 12 }}>
      <BlurView intensity={30} tint={uiTint === 'dark' ? 'dark' : 'light'} style={{ borderRadius: 16, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ color: c.text }}>{selectedCount} selected</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <ActionChip label="Favorite" color={c.accent} onPress={onFavorite} />
            <ActionChip label="Unfavorite" color={c.accent} onPress={onUnfavorite} />
            <ActionChip label="Share" color={c.primary} onPress={onShare} />
            <ActionChip label="Delete" color="#FF453A" onPress={onDelete} />
            <ActionChip label="Cancel" color={c.muted} onPress={onCancel} />
          </View>
        </View>
      </BlurView>
    </View>
  );
}

function UndoBar({ uiTint, c, count, onUndo }: { uiTint: ThemeName; c: any; count: number; onUndo: () => void }) {
  return (
    <BlurView intensity={30} tint={uiTint === 'dark' ? 'dark' : 'light'} style={{ borderRadius: 16, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 }}>
        <Text style={{ color: c.text }}>{count > 1 ? `${count} games deleted` : 'Game deleted'}</Text>
        <Pressable onPress={onUndo}><Text style={{ color: c.primary, fontWeight: '600' }}>Undo</Text></Pressable>
      </View>
    </BlurView>
  );
}

function FilterSheet({ visible, onClose, filters, setters }: { visible: boolean; onClose: () => void; filters: { mode: string; result: string; sort: string; favoritesOnly: boolean }; setters: { setMode: (mode: 'all'|'online'|'local'|'ai') => void; setResult: (result: 'any'|'1-0'|'0-1'|'1/2-1/2') => void; setSort: (sort: 'new'|'old'|'moves') => void; setFavoritesOnly: (fav: boolean) => void; }; }) {
  const sys = useColorScheme();
  const settings = useSettings();
  const mode = settings.theme as 'system'|'light'|'dark';
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <BlurView style={{ flex: 1 }} intensity={20} tint={active}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: c.background, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Filter & Sort</Text>
          <View style={{ gap: 8 }}>
            <Text muted>Game Mode</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(['all','online','local','ai'] as const).map((k) => (
                <Chip key={k} label={k === 'all' ? 'All' : k.toUpperCase()} selected={filters.mode === k} onPress={() => { setters.setMode(k); Haptics.selectionAsync(); }} />
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text muted>Game Result</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(['any','1-0','0-1','1/2-1/2'] as const).map((k) => (
                <Chip key={k} label={labelResultChip(k)} selected={filters.result === k} onPress={() => { setters.setResult(k); Haptics.selectionAsync(); }} />
              ))}
              <Chip label={'Favorites'} selected={filters.favoritesOnly} onPress={() => { setters.setFavoritesOnly(!filters.favoritesOnly); Haptics.selectionAsync(); }} />
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text muted>Sort By</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {(['new','old','moves'] as const).map((k) => (
                <Chip key={k} label={k === 'new' ? 'Newest' : k === 'old' ? 'Oldest' : 'Moves'} selected={filters.sort === k} onPress={() => { setters.setSort(k); Haptics.selectionAsync(); }} />
              ))}
            </View>
          </View>
          <Button title="Done" onPress={onClose} />
        </View>
      </BlurView>
    </Modal>
  );
}

function EmptyState({ title, message, cta, onCtaPress }: { title: string; message: string; cta: string; onCtaPress: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <Ionicons name="archive-outline" size={48} color={themes.dark.muted} />
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>{title}</Text>
        <Text muted style={{ textAlign: 'center' }}>{message}</Text>
      </View>
      <Button title={cta} onPress={onCtaPress} />
    </View>
  );
}


