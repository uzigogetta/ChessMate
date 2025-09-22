import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, Platform, useColorScheme, SectionList, RefreshControl, TextInput, Share, ActionSheetIOS, Modal, Switch, useWindowDimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Text, Chip, Button } from '@/ui/atoms';
import { init, listGames, type GameRow, listFavorites, addFavorite, removeFavorite, deleteGame, addFavorites, removeFavorites } from '@/archive/db';
import { Link, Stack, useRouter, useFocusEffect } from 'expo-router';
import { isUploaded } from '@/shared/cloud';
import { themes, ThemeName, getTheme } from '@/ui/tokens';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSettings } from '@/features/settings/settings.store';
import { Swipeable, RectButton, Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { dynamicColor } from '@/theme/dynamic';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Layout, FadeIn, FadeOut, runOnJS, interpolate } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getJSON, KEYS } from '@/features/storage/mmkv';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { Chess } from 'chess.js';
import { useRoomStore } from '@/features/online/room.store';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function safeFen(raw?: string): string {
  if (!raw || typeof raw !== 'string') return START_FEN;
  const first = raw.split(' ')[0] || '';
  // Quick validity check: must include white and black king in piece placement
  if (!first.includes('K') || !first.includes('k')) return START_FEN;
  return raw;
}
function fenFromPGN(pgn?: string): string | null {
  if (!pgn || typeof pgn !== 'string') return null;
  try {
    const chess = new Chess();
    const ok = (chess as any).load_pgn ? (chess as any).load_pgn(pgn) : chess.loadPgn?.(pgn);
    if (ok === false) return null;
    return chess.fen();
  } catch { return null; }
}
function lastMoveSquaresFromPGN(pgn?: string): { from: string | null; to: string | null } {
  if (!pgn) return { from: null, to: null };
  try {
    const chess = new Chess();
    const ok = (chess as any).load_pgn ? (chess as any).load_pgn(pgn) : chess.loadPgn?.(pgn);
    if (ok === false) return { from: null, to: null };
    const history: any[] = chess.history({ verbose: true } as any);
    const last = history[history.length - 1];
    if (!last) return { from: null, to: null };
    return { from: last.from || null, to: last.to || null };
  } catch { return { from: null, to: null }; }
}

export default function ArchiveListScreen() {
  const [items, setItems] = useState<GameRow[]>([]);
  const listRef = useRef<SectionList<GameRow> | null>(null);
  const router = useRouter();
  const sys = useColorScheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const settings = useSettings();
  const mode = settings.theme as 'system'|'light'|'dark';
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const highContrast = settings.highContrast;
  const c = getTheme(active, { highContrast });
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const finalFenCache = useRef<Map<string, string>>(new Map());
  const [fullPgnIds, setFullPgnIds] = useState<Set<string>>(new Set());
  const lastMoveCache = useRef<Map<string, { from: string | null; to: string | null }>>(new Map());
  const [preview, setPreview] = useState<{ fen: string; from: string | null; to: string | null } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  // Prefer in-app identity from room store for '(me)' annotations
  const roomMeName = useRoomStore((s) => s.me?.name);
  const identity = getJSON<{ id?: string; name?: string }>(KEYS.lastIdentity);
  const myName = roomMeName || identity?.name || '';

  // Warm-up parse for the first few items to avoid visible blank on first expand
  useEffect(() => {
    const flat: GameRow[] = sections.flatMap((s) => s.data);
    const warm = flat.slice(0, 24);
    warm.forEach((g) => {
      if (!finalFenCache.current.has(g.id)) {
        const f = fenFromPGN((g as any).pgn);
        if (f) finalFenCache.current.set(g.id, f);
      }
      if (!lastMoveCache.current.has(g.id)) {
        lastMoveCache.current.set(g.id, lastMoveSquaresFromPGN((g as any).pgn));
      }
    });
  }, [sections]);

  const summarySV = useSharedValue(0);
  const selectSV = useSharedValue(0);
  const undoSV = useSharedValue(0);

  const fetchData = useCallback(async () => {
    try {
      await init();
      const modeForDb = (modeFilter === 'online' ? '1v1' : modeFilter) as any;
      const rows = await listGames({ mode: modeForDb, result: resultFilter, sort, favoritesOnly, query });
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

  const displayDates = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of items) {
      m.set(g.id, new Date(g.createdAt).toLocaleString());
    }
    return m;
  }, [items]);

  const onRefresh = useCallback(async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRefreshing(true); await fetchData(); setRefreshing(false); }, [fetchData]);

  useEffect(() => { const next = showSummary ? 1 : 0; summarySV.value = reduceMotion ? next : withSpring(next, { damping: 18, stiffness: 200 }); }, [showSummary, reduceMotion]);
  useEffect(() => { const next = selectMode ? 1 : 0; selectSV.value = reduceMotion ? next : withSpring(next, { damping: 18, stiffness: 200 }); }, [selectMode, reduceMotion]);
  useEffect(() => { const next = pendingDelete ? 1 : 0; undoSV.value = reduceMotion ? next : withSpring(next, { damping: 18, stiffness: 200 }); }, [pendingDelete, reduceMotion]);

  const summaryStyle = useAnimatedStyle(() => ({ opacity: summarySV.value, transform: [{ translateY: (1 - summarySV.value) * 12 }] }));
  const selectStyle = useAnimatedStyle(() => ({ opacity: selectSV.value, transform: [{ translateY: (1 - selectSV.value) * 40 }] }));
  const undoStyle = useAnimatedStyle(() => ({ opacity: undoSV.value, transform: [{ translateY: (1 - undoSV.value) * 16 }] }));

  const ListHeaderContent = () => (
    <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', gap: 12, marginTop: 8, marginBottom: 8 }}>
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

  const shareOne = useCallback(async (g: GameRow) => { try { await Share.share({ message: g.pgn, title: `${g.whiteName || 'White'} vs ${g.blackName || 'Black'}` }); Haptics.selectionAsync(); } catch {} }, []);

  const presentRowActions = useCallback((g: GameRow) => {
    const isFav = favs.includes(g.id);
    const options = ['Share PGN', 'Copy PGN', isFav ? 'Unfavorite' : 'Favorite', 'Delete', 'Cancel'];
    Haptics.selectionAsync();
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: 4, destructiveButtonIndex: 3, userInterfaceStyle: active === 'dark' ? 'dark' : 'light' },
      async (idx) => {
        if (idx === 0) { await shareOne(g); }
        else if (idx === 1) { try { await Clipboard.setStringAsync(g.pgn); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {} }
        else if (idx === 2) { toggleFavorite(g.id); }
        else if (idx === 3) { scheduleDelete([g]); }
      }
    );
  }, [favs, active, shareOne, toggleFavorite, scheduleDelete]);

  const badgeTintForGame = useCallback((g: GameRow) => {
    const normalize = (s?: string) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const me = normalize(myName);
    const white = normalize(g.whiteName);
    const black = normalize(g.blackName);
    const match = (a: string, b: string) => !!a && !!b && (a === b || a.includes(b) || b.includes(a));
    const meIsWhite = match(me, white);
    const meIsBlack = match(me, black);
    const r = g.result;

    if (meIsWhite || meIsBlack) {
      const isWin = (meIsWhite && r === '1-0') || (meIsBlack && r === '0-1');
      const isLoss = (meIsWhite && r === '0-1') || (meIsBlack && r === '1-0');
      if (isWin) return tintWithAlpha('#34C759', 0.22, active); // green
      if (isLoss) return tintWithAlpha('#FF3B30', 0.22, active); // red
      // Draw or unknown -> neutral
      return tintWithAlpha(c.muted as any, 0.22, active);
    }

    // Can't determine user's side -> neutral (avoid misleading colors)
    return tintWithAlpha(c.muted as any, 0.22, active);
  }, [myName, active, c]);

  const renderItem = ({ item: g }: { item: GameRow }) => {
    const isSelected = selectMode && selected.has(g.id);
    const pov = personalOutcome(myName, g, c, active);
    const isExpanded = expandedId === g.id;
    const showFullPGN = fullPgnIds.has(g.id);
    const pressSV = useSharedValue(1);
    const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressSV.value }] }));

    const inner = (
      <RectButton
        accessibilityRole="button"
        accessibilityLabel={`${g.whiteName || 'White'} versus ${g.blackName || 'Black'}, result ${resultShort(g.result)}`}
        accessibilityHint="Opens game details"
        onLongPress={() => (selectMode ? setSelected((prev) => { const next = new Set(prev); if (next.has(g.id)) next.delete(g.id); else next.add(g.id); return next; }) : presentRowActions(g))}
        onPress={() => {
          if (selectMode) {
            setSelected((prev) => { const next = new Set(prev); if (next.has(g.id)) next.delete(g.id); else next.add(g.id); return next; });
          } else {
            Haptics.selectionAsync();
            // compute final FEN & last move synchronously if needed, then show immediately
            if (!finalFenCache.current.has(g.id)) {
              const computed = fenFromPGN((g as any).pgn);
              if (computed) finalFenCache.current.set(g.id, computed);
            }
            if (!lastMoveCache.current.has(g.id)) {
              lastMoveCache.current.set(g.id, lastMoveSquaresFromPGN((g as any).pgn));
            }
            setExpandedId((cur) => cur === g.id ? null : g.id);
          }
        }}
        onActiveStateChange={(active) => { pressSV.value = withTiming(active ? 0.98 : 1, { duration: 110 }); }}
      >
        <Animated.View layout={Layout.duration(180)}>
        <Animated.View style={pressStyle}>
        <Card style={{ paddingVertical: 14, paddingHorizontal: 14, borderRadius: 18, borderWidth: isSelected ? 2 : 0, borderColor: isSelected ? c.primary : 'transparent' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              {(() => {
                const norm = (s?: string) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
                const annotate = (n?: string) => {
                  const name = (n || 'Guest').toString();
                  const already = name.startsWith('(me) ');
                  const m = norm(myName);
                  const a = norm(name);
                  const isMe = m.length > 0 && (a.includes(m) || m.includes(a));
                  return !already && isMe ? `(me) ${name}` : name;
                };
                const left = annotate(g.whiteName || 'White');
                const right = annotate(g.blackName || 'Black');
                return <Text style={{ fontSize: 17 }} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.3}>{`${left} vs ${right}`}</Text>;
              })()}
              <Text muted style={{ fontSize: 13 }} maxFontSizeMultiplier={1.2}>{`${displayDates.get(g.id) || ''} • ${g.mode} • ${g.moves} moves`}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 22, alignItems: 'center', justifyContent: 'center' }}>
                {favs.includes(g.id) ? (
                  <Badge label="★" tint={tintWithAlpha(c.accent as any, 0.2, active)} textColor={c.text as any} />
                ) : null}
              </View>
              <Animated.View entering={FadeIn.duration(120)} layout={Layout.duration(180)}>
                {pov && (<OutcomeBadge label={pov.label} color={pov.color} />)}
              </Animated.View>
              <Animated.View entering={FadeIn.duration(120)} layout={Layout.duration(180)}>
                <Badge label={resultShort(g.result)} tint={badgeTintForResult(g.result, c, active)} textColor={badgeTextColor(active)} />
              </Animated.View>
              <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}>
                <Ionicons name="chevron-forward" size={16} color={c.muted as any} />
              </View>
            </View>
          </View>

          {isExpanded && (
            <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={{ marginTop: 12, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <BlurView intensity={20} tint={active} style={{ borderRadius: 12, overflow: 'hidden', flex: 0 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Enlarge board preview"
                    accessibilityHint="Opens a larger preview of the final position"
                    onPress={() => {
                      const lm = lastMoveCache.current.get(g.id) || lastMoveSquaresFromPGN((g as any).pgn);
                      const fen = finalFenCache.current.get(g.id) || fenFromPGN((g as any).pgn) || (g as any).finalFen || (g as any).fen;
                      if (fen && !finalFenCache.current.has(g.id)) finalFenCache.current.set(g.id, fen);
                      if (lm && !lastMoveCache.current.has(g.id)) lastMoveCache.current.set(g.id, lm);
                      setPreview({ fen: safeFen(fen), from: lm?.from || null, to: lm?.to || null });
                      setShowPreview(true);
                      Haptics.selectionAsync();
                    }}
                    style={{ padding: 6 }}
                  >
                    {(() => { const lm = lastMoveCache.current.get(g.id) || lastMoveSquaresFromPGN((g as any).pgn); const fen = finalFenCache.current.get(g.id) || fenFromPGN((g as any).pgn) || (g as any).finalFen || (g as any).fen; if (fen && !finalFenCache.current.has(g.id)) finalFenCache.current.set(g.id, fen); if (lm && !lastMoveCache.current.has(g.id)) lastMoveCache.current.set(g.id, lm); return (
                      <BoardSkia fen={safeFen(fen)} size={100} onMove={() => {}} enabled={false} lastFrom={lm?.from || null} lastTo={lm?.to || null} />
                    ); })()}
                  </Pressable>
                </BlurView>
                <BlurView intensity={20} tint={active} style={{ borderRadius: 12, overflow: 'hidden', flex: 1 }}>
                  <View style={{ padding: 10 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Copy PGN"
                      hitSlop={8}
                      onPress={async () => { try { await Clipboard.setStringAsync(g.pgn); Haptics.selectionAsync(); } catch {} }}
                      style={{ position: 'absolute', right: 8, top: 8, width: 28, height: 28, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <BlurView intensity={20} tint={active} style={{ position: 'absolute', inset: 0 }} />
                      <Ionicons name="copy-outline" size={16} color={c.muted as any} />
                    </Pressable>
                    <Animated.View layout={Layout.duration(160)} style={{ maxHeight: showFullPGN ? undefined : 96, overflow: 'hidden' }}>
                      <Text style={{ fontSize: 13 }} maxFontSizeMultiplier={1.2}>{g.pgn?.trim() || 'No PGN available.'}</Text>
                    </Animated.View>
                  </View>
                </BlurView>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showFullPGN ? 'Collapse moves' : 'View moves'}
                  onPress={() => {
                    setFullPgnIds((prev) => { const next = new Set(prev); if (next.has(g.id)) next.delete(g.id); else next.add(g.id); return next; });
                  }}
                >
                  <Text style={{ color: c.primary as any, fontSize: 13, fontWeight: '600' }}>{showFullPGN ? 'Collapse moves' : 'View moves'}</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <ActionChip label="Share" color={c.primary as any} onPress={() => shareOne(g)} />
                  <ActionChip label={favs.includes(g.id) ? 'Unfavorite' : 'Favorite'} color={c.accent as any} onPress={() => toggleFavorite(g.id)} />
                </View>
                <ActionChip label="Full View" color={c.primary as any} onPress={() => router.push(`/archive/${g.id}`)} />
              </View>
            </Animated.View>
          )}
        </Card>
        </Animated.View>
        </Animated.View>
      </RectButton>
    );
    const wrapped = inner; // Keep in-list interactions; future: expand/collapse
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open filters"
              accessibilityHint="Opens filter sheet"
              onPress={() => { Haptics.selectionAsync(); setShowFilters(true); }}
            >
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
            scopeButtonTitles: ['All', 'Online', 'Local', 'AI'],
            onChangeScopeButton: (e: any) => {
              const idx = e?.nativeEvent?.scopeButtonIndex ?? 0;
              const map = ['all', 'online', 'local', 'ai'] as const;
              const next = map[Math.max(0, Math.min(3, idx))];
              setModeFilter(next);
            },
          } as any,
        }}
      />
      {/* Enlarge board preview modal */}
      <Modal visible={showPreview} transparent animationType="fade" onRequestClose={() => setShowPreview(false)}>
        <Pressable onPress={() => { setShowPreview(false); Haptics.selectionAsync(); }} style={{ flex: 1 }}>
          <BlurView intensity={40} tint={active} style={{ position: 'absolute', inset: 0 }} />
        </Pressable>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            <BlurView intensity={30} tint={active} style={{ padding: 10 }}>
              {preview && (
                <ScrollView
                  contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
                  maximumZoomScale={2.2}
                  minimumZoomScale={1}
                  centerContent
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                >
                  <BoardSkia fen={preview.fen} size={Math.min(screenWidth - 64, 420)} onMove={() => {}} enabled={false} lastFrom={preview.from} lastTo={preview.to} />
                </ScrollView>
              )}
            </BlurView>
          </View>
        </View>
      </Modal>
      <SectionList
        ref={listRef as any}
        sections={sections}
        keyExtractor={(g) => String(g.id)}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={<ListHeaderContent />}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 12 }}
        style={{ flex: 1, backgroundColor: c.background }}
        scrollsToTop
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustsScrollIndicatorInsets={true}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.muted} />}
        stickySectionHeadersEnabled
        keyboardDismissMode={'on-drag'}
        onScroll={(e) => { const y = e.nativeEvent.contentOffset.y; setShowSummary(y > 12); }}
        scrollEventThrottle={16}
        ListEmptyComponent={
          items.length === 0 ? (
            <EmptyState title="No Games Saved" message="Your completed games will appear here." cta="Play a Game" onCtaPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/play'); }} />
          ) : (
            <EmptyState title="No Results" message="No games match your current filters." cta="Clear Filters" onCtaPress={() => { setQuery(''); setModeFilter('all'); setResultFilter('any'); setFavoritesOnly(false); setSort('new'); Haptics.selectionAsync(); }} />
          )
        }
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={30}
      />
      <FilterSheet visible={showFilters} onClose={() => { Haptics.selectionAsync(); setShowFilters(false); }}
        filters={{ mode: modeFilter, result: resultFilter, sort, favoritesOnly }}
        setters={{ setMode: setModeFilter, setResult: setResultFilter, setSort, setFavoritesOnly }}
      />

      {__DEV__ && (
        <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
          <BoardSkia fen={START_FEN} size={80} onMove={() => {}} enabled={false} />
        </View>
      )}

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

function resultShort(r: string) { if (r === '1/2-1/2' || r === '1/2') return '½'; return r; }
function tintWithAlpha(color: any, alpha: number, ui?: ThemeName) { if (typeof color === 'string' && color.startsWith('#')) { const { r, g, b } = hexToRgb(color); return `rgba(${r}, ${g}, ${b}, ${alpha})`; } return `rgba(${ui === 'dark' ? 242 : 28}, ${ui === 'dark' ? 242 : 28}, ${ui === 'dark' ? 247 : 30}, ${alpha})`; }

function normalizeWinnerFirst(g: GameRow, palette: any, ui: ThemeName) {
  const white = g.whiteName || 'White';
  const black = g.blackName || 'Black';
  const r = g.result;
  if (r === '1/2-1/2') {
    return { left: white, right: black, label: '½', tint: tintWithAlpha(palette.muted as any, 0.22, ui) };
  }
  if (r === '0-1') {
    // Black won -> show winner first
    return { left: black, right: white, label: '1-0', tint: tintWithAlpha('#34C759', 0.22, ui) };
  }
  // Default (1-0 or unknown) -> White won
  return { left: white, right: black, label: '1-0', tint: tintWithAlpha('#34C759', 0.22, ui) };
}

function badgeTintForResult(result: string, c: any, ui: ThemeName) {
  return tintWithAlpha(c.muted, 0.16, ui); // neutral pill for clean look
}

function personalOutcome(myName: string, g: GameRow, palette: any, ui: ThemeName): { label: 'W' | 'L' | 'D'; color: string } | null {
  const r = g.result;
  if (r === '1/2-1/2' || r === '1/2') return { label: 'D', color: '#FFD60A' };
  if (r === '0-1') return { label: 'W', color: '#34C759' };
  if (r === '1-0') return { label: 'L', color: '#FF3B30' };
  return null;
}

function cloudBadgeTint(c: any, ui: ThemeName, highContrast?: boolean) { return highContrast ? tintWithAlpha(c.primary, 0.3) : tintWithAlpha(c.muted, 0.2, ui); }
function hexToRgb(hex: string) { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return { r, g, b }; }
function badgeTextColor(ui: ThemeName) { return ui === 'dark' ? '#fff' : '#000'; }

function Badge({ label, tint, textColor }: { label: string; tint: string; textColor: string }) {
  const settings = useSettings();
  const sys = useColorScheme();
  const highContrast = settings.highContrast;
  const mode = settings.theme as 'system'|'light'|'dark';
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;

  if (highContrast) {
    const bg = tint; // respect provided tint to keep neutral look
    const fg = textColor;
    return (
      <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: active === 'dark' ? '#FFFFFF' : '#000000' }}>
        <Text style={{ fontSize: 12, color: fg }}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: tint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 12, color: textColor }}>{label}</Text>
    </View>
  );
}

function OutcomeBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: 13, fontWeight: '600', lineHeight: 16, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function buildSummaryText(filters: any) { const parts = []; if (filters.query) parts.push(filters.query); if (filters.mode !== 'all') parts.push(filters.mode); if (filters.result !== 'any') parts.push(filters.result); if (filters.sort !== 'new') parts.push(filters.sort); if (filters.favoritesOnly) parts.push('Favorites'); return parts.length > 0 ? parts.join(' • ') : 'No filters'; }

function FilterSummaryPill({ uiTint, c, text, onPress }: { uiTint: ThemeName; c: any; text: string; onPress: () => void }) {
  const pill = (<Pressable onPress={onPress}><View style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: tintWithAlpha(c.card, 0.65) }}><Text style={{ color: c.text, fontSize: 13 }}>{text}</Text></View></Pressable>);
  return (<BlurView intensity={40} tint={uiTint === 'dark' ? 'dark' : 'light'} style={{ borderRadius: 999, overflow: 'hidden' }}>{pill}</BlurView>);
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

// Bottom sheet-style FilterSheet (transparent overlay)
function FilterSheet({ visible, onClose, filters, setters }: { visible: boolean; onClose: () => void; filters: any; setters: any }) {
  const sys = useColorScheme();
  const settings = useSettings();
  const mode = settings.theme as 'system'|'light'|'dark';
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const dim = useSharedValue(1);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const closeWithHaptics = React.useCallback(() => { Haptics.selectionAsync(); onClose(); }, [onClose]);
  const { height } = useWindowDimensions();
  const startOffset = 64;
  const dismiss = React.useCallback(() => {
    const target = Math.max(240, Math.min(height * 0.6, height - 80));
    // animate down then close
    translateY.value = withTiming(target, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(closeWithHaptics)();
      }
    });
    dim.value = withTiming(0, { duration: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, closeWithHaptics]);
  React.useEffect(() => {
    if (visible) {
      // Prepare and animate in
      translateY.value = startOffset;
      dim.value = 0;
      translateY.value = withTiming(0, { duration: 200 });
      dim.value = withTiming(1, { duration: 180 });
    }
  }, [visible, translateY, dim]);

  const pan = Gesture.Pan()
    .minDistance(0)
    .activeOffsetY([-3, 3])
    .enableTrackpadTwoFingerGesture(true)
    .onUpdate((event) => {
      const raw = event.translationY;
      const next = raw < 0 ? raw * 0.3 : raw;
      translateY.value = Math.max(0, next);
      dim.value = interpolate(translateY.value, [0, 220], [1, 0.6]);
    })
    .onFinalize((event) => {
      const fastFlick = event.velocityY > 1200;
      if (translateY.value > 140 || fastFlick) {
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 240 });
        dim.value = withTiming(1, { duration: 180 });
      }
    });

  const gestures = Gesture.Simultaneous(pan, Gesture.Native());

  return (
    <Modal visible={visible} transparent presentationStyle="overFullScreen" animationType="none" onRequestClose={dismiss}>
      <Pressable onPress={dismiss} style={{ flex: 1 }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, dimStyle]}>
          <BlurView intensity={30} tint={active} style={{ position: 'absolute', inset: 0 }} />
        </Animated.View>
      </Pressable>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <GestureDetector gesture={gestures}>
          <Animated.View style={[{ marginHorizontal: 10, marginBottom: Math.max(12, insets.bottom + 8), borderRadius: 18, overflow: 'hidden' }, sheetStyle]}>
            <BlurView intensity={40} tint={active} style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 12 }}>
              <View style={{ alignItems: 'center', paddingBottom: 10 }} accessibilityRole="adjustable" accessibilityLabel="Drag to dismiss">
                <View style={{ width: 44, height: 6, borderRadius: 4, backgroundColor: active === 'dark' ? '#3A3A3C' : '#C7C7CC' }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: c.text }}>Filters</Text>
                <Pressable onPress={() => { Haptics.selectionAsync(); dismiss(); }} hitSlop={12}><Ionicons name="close" size={22} color={c.muted as any} /></Pressable>
              </View>

              <FilterGroup label="Game Mode">
                <SegmentedControl value={filters.mode} onValueChange={setters.setMode}
                  options={[ { label: 'All', value: 'all' }, { label: 'Online', value: 'online' }, { label: 'Local', value: 'local' }, { label: 'vs AI', value: 'ai' } ]}
                />
              </FilterGroup>

              <FilterGroup label="Result">
                <SegmentedControl value={filters.result} onValueChange={setters.setResult}
                  options={[ { label: 'Any', value: 'any' }, { label: 'Win', value: '1-0' }, { label: 'Loss', value: '0-1' }, { label: 'Draw', value: '1/2-1/2' } ]}
                />
              </FilterGroup>

              <FilterGroup label="Sort By">
                <SegmentedControl value={filters.sort} onValueChange={setters.setSort}
                  options={[ { label: 'Newest', value: 'new' }, { label: 'Oldest', value: 'old' }, { label: 'Moves', value: 'moves' } ]}
                />
              </FilterGroup>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <Text style={{ fontSize: 16, color: c.text }}>Favorites Only</Text>
                <Switch value={filters.favoritesOnly} onValueChange={setters.setFavoritesOnly} />
              </View>

              <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: Platform.OS === 'ios' ? 0.5 : 1, borderTopColor: active === 'dark' ? '#3A3A3C' : '#D1D1D6' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Reset filters" onPress={() => { Haptics.selectionAsync(); setters.setMode('all'); setters.setResult('any'); setters.setSort('new'); setters.setFavoritesOnly(false); }} hitSlop={12}>
                    <Text style={{ color: '#8E8E93', fontSize: 16 }}>Reset</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Apply filters" onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); dismiss(); }} hitSlop={12}>
                    <View style={{ backgroundColor: c.primary as any, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 }}>
                      <Text style={{ color: active === 'dark' ? '#000' : '#fff', fontSize: 16, fontWeight: '600' }}>Done</Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            </BlurView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, color: c.muted, textTransform: 'uppercase', paddingLeft: 12 }}>{label}</Text>
      {children}
    </View>
  );
}

function SegmentedControl({ options, value, onValueChange }: { options: { label: string, value: string }[]; value: string; onValueChange: (value: string) => void }) {
  const active = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = themes[active];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: active === 'dark' ? '#2C2C2E' : '#E5E5EA', borderRadius: 10, padding: 3 }}>
      {options.map((opt) => (
        <Pressable key={opt.value} onPress={() => onValueChange(opt.value)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: value === opt.value ? (active === 'dark' ? '#636366' : '#FFFFFF') : 'transparent' }}>
          <Text style={{ textAlign: 'center', fontSize: 15, color: c.text, fontWeight: value === opt.value ? '600' : '400' }}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function useTheme() {
  const sys = useColorScheme();
  const settings = useSettings();
  const mode = settings.theme as 'system'|'light'|'dark';
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  return themes[active];
}

function EmptyState({ title, message, cta, onCtaPress }: { title: string; message: string; cta?: string; onCtaPress?: () => void }) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, gap: 12, paddingTop: 80, paddingHorizontal: 20, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '600', color: c.text }}>{title}</Text>
      <Text muted style={{ fontSize: 16, textAlign: 'center', maxWidth: 280 }}>{message}</Text>
      {cta && onCtaPress && <Button title={cta} onPress={onCtaPress} />}
    </View>
  );
}


