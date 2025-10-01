import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  Share,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';

import {
  addFavorite,
  addFavorites,
  deleteGame,
  init,
  listFavorites,
  listGames,
  removeFavorite,
  removeFavorites,
  type GameRow,
} from '@/archive/db';
import { Button, Card, Chip, Text } from '@/ui/atoms';
import { themes, ThemeName, getTheme } from '@/ui/tokens';
import { useSettings } from '@/features/settings/settings.store';
import { getJSON, setJSON, KEYS } from '@/features/storage/mmkv';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { Chess } from 'chess.js';
import { toast } from '@/ui/toast';
import { useRoomStore } from '@/features/online/room.store';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FILTERS_KEY = KEYS.archiveFilters || 'cm.archive.filters';
const ESTIMATED_ITEM_HEIGHT = 220;

type Filters = {
  mode: 'all' | 'online' | 'local' | 'ai';
  result: 'any' | '1-0' | '0-1' | '1/2-1/2';
  sort: 'new' | 'old' | 'moves';
  favoritesOnly: boolean;
};

type FlatItem =
  | { key: string; type: 'header'; title: string }
  | { key: string; type: 'game'; game: GameRow };

type Snackbar = { message: string; actionLabel?: string; onAction?: () => void } | null;

type PreviewState = { fen: string; from: string | null; to: string | null; result?: string | null };

type ExpandedState = { detailsId: string | null; fullDetails: Set<string> };

type PersonaSummary = {
  id: string;
  name: string;
  title: string;
  fallback: string;
  gradient: string[];
  accent: string;
  tone: string;
};

function safeFen(raw?: string): string {
  if (!raw || typeof raw !== 'string') return START_FEN;
  const trimmed = raw.trim();
  if (!trimmed) return START_FEN;
  const parts = trimmed.split(/\s+/);
  const board = parts[0] ?? '';
  if (!board.includes('K') || !board.includes('k')) return START_FEN;
  return trimmed;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

function modeLabel(mode: string) {
  if (mode === 'ai') return 'VS AI';
  if (mode === 'online' || mode === '1v1') return 'Online';
  if (mode === 'local') return 'Local';
  return mode.toUpperCase();
}

function resultShort(result?: string | null) {
  if (!result) return '?';
  if (result === '1/2-1/2') return '½';
  return result;
}

function tintWithAlpha(color: string, alpha: number, theme: ThemeName) {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (color.startsWith('rgba')) return color;
  return theme === 'dark' ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
}

function badgeTint(result: string | null | undefined, palette: any, theme: ThemeName) {
  if (result === '1-0') return tintWithAlpha('#34C759', 0.22, theme);
  if (result === '0-1') return tintWithAlpha('#FF3B30', 0.22, theme);
  if (result === '1/2-1/2') return tintWithAlpha(palette.muted as any, 0.18, theme);
  return tintWithAlpha(palette.muted as any, 0.16, theme);
}

function fenFromPGN(pgn?: string): string | null {
  if (!pgn || typeof pgn !== 'string') return null;
  try {
    const chess = new Chess();
    const ok = (chess as any).load_pgn ? (chess as any).load_pgn(pgn) : chess.loadPgn?.(pgn);
    if (ok === false) return null;
    return chess.fen();
  } catch {
    return null;
  }
}

function lastMoveSquaresFromPGN(pgn?: string): { from: string | null; to: string | null } {
  if (!pgn) return { from: null, to: null };
  try {
    const chess = new Chess();
    const ok = (chess as any).load_pgn ? (chess as any).load_pgn(pgn) : chess.loadPgn?.(pgn);
    if (ok === false) return { from: null, to: null };
    const history: any[] = chess.history({ verbose: true } as any) || [];
    if (!history.length) return { from: null, to: null };
    const last = history[history.length - 1];
    const from = typeof last?.from === 'string' ? last.from : null;
    const to = typeof last?.to === 'string' ? last.to : null;
    return { from, to };
  } catch {
    return { from: null, to: null };
  }
}

function sanSequenceFromPGN(pgn?: string): string[] {
  if (!pgn || typeof pgn !== 'string') return [];
  try {
    const chess = new Chess();
    const ok = (chess as any).load_pgn ? (chess as any).load_pgn(pgn) : chess.loadPgn?.(pgn);
    if (ok === false) return [];
    const history = chess.history?.() ?? [];
    if (Array.isArray(history)) return history as string[];
    return [];
  } catch {
    return [];
  }
}

function MoveStrip({
  moves,
  accent,
}: {
  moves: string[];
  accent: string;
}) {
  const rows = useMemo(() => {
    const output: { index: number; white: string; black: string }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      output.push({
        index: i / 2 + 1,
        white: moves[i] ?? '',
        black: moves[i + 1] ?? '',
      });
    }
    return output;
  }, [moves]);

  const capsuleHeight = Math.min(200, rows.length * 32 + 24);
  return (
    <View
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(18,18,20,0.82)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.04)',
        marginHorizontal: 2,
      }}
    >
      <LinearGradient
        colors={[`${accent}33`, `${accent}0D`]}
        style={{ paddingVertical: 12, paddingHorizontal: 16 }}
      >
        <Text style={{ color: '#f8f8f8', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Move list</Text>
        <ScrollView
          style={{ maxHeight: capsuleHeight }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          {rows.map((row) => (
            <View
              key={row.index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 6,
                gap: 12,
              }}
            >
              <Text style={{ width: 24, color: 'rgba(248,248,255,0.55)', fontSize: 12 }}>{row.index}.</Text>
              <View style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <Text style={{ color: '#f4f4f8', fontSize: 13 }}>{row.white || '–'}</Text>
              </View>
              <View style={{ flex: 1, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <Text style={{ color: '#f4f4f8', fontSize: 13 }}>{row.black || '–'}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function CoachTag({ label, accent }: { label: string; accent: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: `${accent}22`,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: `${accent}55`,
      }}
    >
      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function CoachCapsule({
  persona,
  accent,
  highContrast,
}: {
  persona: PersonaPreset;
  accent: string;
  highContrast: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <View
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: highContrast ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.04)',
        marginHorizontal: 2,
      }}
    >
      <LinearGradient
        colors={persona.gradient.length ? persona.gradient : [accent, `${accent}88`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16, gap: 14 }}
      >
        <Pressable
          onPress={() => setOpen((prev) => !prev)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Toggle coach persona details"
          accessibilityState={{ expanded: open }}
        >
          <CommentaryAvatar fallback={persona.fallback} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>{persona.name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12 }}>{persona.title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.62)', fontSize: 11, marginTop: 4 }}>
              Tap to {open ? 'hide' : 'view'} persona profile
            </Text>
          </View>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(14,14,22,0.25)',
            }}
          >
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color="#fff" />
          </View>
        </Pressable>

        {open && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: '#ffffff', fontSize: 13, lineHeight: 18 }}>{persona.description}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <CoachTag label={`Tone • ${persona.tone}`} accent={accent} />
              <CoachTag label={`Skill • ${persona.engine.skill}`} accent={accent} />
              {typeof persona.engine.depthBias === 'number' && (
                <CoachTag label={`Depth +${persona.engine.depthBias}`} accent={accent} />
              )}
              {typeof persona.engine.movetimeBiasMs === 'number' && (
                <CoachTag label={`Extra ${persona.engine.movetimeBiasMs} ms`} accent={accent} />
              )}
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

function fenFromGame(game: GameRow): string | undefined {
  return fenFromPGN(game.pgn) || (game as any).finalFen || (game as any).fen;
}

function memoizeBoardState(
  game: GameRow | undefined,
  fenCache: React.MutableRefObject<Map<string, string>>,
  lastMoveCache: React.MutableRefObject<Map<string, { from: string | null; to: string | null }>>,
  movesCache: React.MutableRefObject<Map<string, { moves: string[]; signature: string }>>
) {
  if (!game) {
    return { boardFen: START_FEN, lastMove: { from: null, to: null }, movesSan: [] as string[] };
  }
  let boardFen = fenCache.current.get(game.id);
  if (!boardFen) {
    boardFen = fenFromGame(game) ?? START_FEN;
    fenCache.current.set(game.id, boardFen);
  }

  let last = lastMoveCache.current.get(game.id);
  if (!last) {
    last = lastMoveSquaresFromPGN(game.pgn);
    lastMoveCache.current.set(game.id, last);
  }

  const signature = typeof game.pgn === 'string' ? game.pgn : '';
  let entry = movesCache.current.get(game.id);
  if (!entry || entry.signature !== signature) {
    entry = { moves: sanSequenceFromPGN(game.pgn), signature };
    movesCache.current.set(game.id, entry);
  }

  return {
    boardFen: safeFen(boardFen),
    lastMove: { from: last?.from ?? null, to: last?.to ?? null },
    movesSan: entry.moves,
  };
}

const AnimatedCard = Animated.createAnimatedComponent(Card);

export function ArchiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const settings = useSettings();
  const sysTheme = settings.theme === 'system' ? (settings.systemTheme ?? 'light') : settings.theme;
  const activeTheme = (sysTheme === 'dark' ? 'dark' : 'light') as ThemeName;
  const highContrast = settings.highContrast;
  const reduceMotion = settings.reduceMotion;
  const palette = getTheme(activeTheme, { highContrast });
  const isIOS = Platform.OS === 'ios';
  const sheetOpenSpring = useMemo(
    () => ({ damping: isIOS ? 18 : 20, stiffness: isIOS ? 320 : 360, mass: 0.82 }),
    [isIOS]
  );
  const sheetCloseSpring = useMemo(
    () => ({ damping: isIOS ? 22 : 24, stiffness: isIOS ? 340 : 380, mass: 0.88 }),
    [isIOS]
  );
  const overlayMaxOpacity = reduceMotion ? 0.4 : 0.6;

  const [items, setItems] = useState<GameRow[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(() => {
    const stored = getJSON<Partial<Filters>>(FILTERS_KEY);
    return {
      mode: stored?.mode ?? 'all',
      result: stored?.result ?? 'any',
      sort: stored?.sort ?? 'new',
      favoritesOnly: stored?.favoritesOnly ?? false,
    };
  });
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<ExpandedState>({ detailsId: null, fullDetails: new Set() });
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filtersInteractive, setFiltersInteractive] = useState(false);
  const [snackbar, setSnackbar] = useState<Snackbar>(null);
  const [scrollLabel, setScrollLabel] = useState<string | null>(null);
  const [contextItem, setContextItem] = useState<GameRow | null>(null);
  const snackbarTimer = useRef<NodeJS.Timeout | null>(null);
  const labelTimer = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<FlashList<FlatItem>>(null);
  const allowClipped = useRef(true);

  const sheetTranslate = useSharedValue(0);
  const sheetOpacity = useSharedValue(0);
  const sheetHeight = useRef(360);
  const sheetHeightSV = useSharedValue(360);
  const summarySV = useSharedValue(0);
  const selectSV = useSharedValue(0);
  const snackbarSV = useSharedValue(0);
  const gestureStart = useSharedValue(0);

  const fenCache = useRef<Map<string, string>>(new Map());
  const lastMoveCache = useRef<Map<string, { from: string | null; to: string | null }>>(new Map());
  const moveListCache = useRef<Map<string, { moves: string[]; signature: string }>>(new Map());

  const roomName = useRoomStore((s) => s.me?.name);
  const cachedIdentity = useMemo(() => getJSON<{ name?: string }>(KEYS.lastIdentity), []);
  const myName = useMemo(() => (roomName || cachedIdentity?.name || '').trim(), [roomName, cachedIdentity?.name]);

  const filtersDefault =
    filters.mode === 'all' &&
    filters.result === 'any' &&
    filters.sort === 'new' &&
    !filters.favoritesOnly &&
    !query;

  useEffect(() => {
    setJSON(FILTERS_KEY, filters);
  }, [filters]);

  useEffect(() => {
    // When filters change we scroll to top naturally, no manual pagination reset needed.
  }, [filters.mode, filters.result, filters.sort, filters.favoritesOnly, query]);

  const fetchData = useCallback(async () => {
    try {
      await init();
      const rows = (await listGames({
        mode: filters.mode === 'online' ? '1v1' : filters.mode,
        result: filters.result,
        sort: filters.sort,
        favoritesOnly: filters.favoritesOnly,
        query,
      })).filter((row): row is GameRow => Boolean(row));
      const favs = (await listFavorites()).filter(Boolean);
      setItems(rows);
      setFavorites(favs);
    } catch (error) {
      console.warn('[Archive] fetchData failed', error);
    }
  }, [filters.mode, filters.result, filters.sort, filters.favoritesOnly, query]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);


  const sections = useMemo(() => {
    const grouped = new Map<string, GameRow[]>();
    const favSet = new Set(favorites);
    const favRows: GameRow[] = [];

    for (const row of items) {
      if (!row) continue;
      if (!filters.favoritesOnly && favSet.has(row.id)) {
        favRows.push(row);
        continue;
      }
      const key = dayKey(new Date(row.createdAt));
      const bucket = grouped.get(key) ?? [];
      bucket.push(row);
      grouped.set(key, bucket);
    }

    const result: { title: string; data: GameRow[] }[] = [];
    if (!filters.favoritesOnly && favRows.length) {
      result.push({ title: 'Favorites', data: favRows });
    }

    Array.from(grouped.keys())
      .sort((a, b) => (a < b ? 1 : -1))
      .forEach((key) => {
        const date = new Date(key);
        const pretty = date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: new Date().getFullYear() === date.getFullYear() ? undefined : 'numeric',
        });
        result.push({ title: pretty, data: grouped.get(key) ?? [] });
      });

    return result;
  }, [favorites, filters.favoritesOnly, items]);

  const sectionData = useMemo<ArchiveSection[]>(() => {
    const arr: ArchiveSection[] = [];
    sections.forEach((section) => {
      const cleanData = section.data.filter((g): g is GameRow => Boolean(g));
      if (cleanData.length === 0) return;
      arr.push({ ...section, data: cleanData });
    });
    return arr;
  }, [sections]);

  const flatData = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = [];
    sectionData.forEach((section) => {
      out.push({ key: `header-${section.title}`, type: 'header', title: section.title });
      section.data.forEach((game) => out.push({ key: game.id, type: 'game', game }));
    });
    return out;
  }, [sectionData]);


  const stickyIndices = useMemo(() => {
    const indices: number[] = [];
    flatData.forEach((item, idx) => {
      if (item.type === 'header') indices.push(idx);
    });
    return indices;
  }, [flatData]);

  const displayDates = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((g) => map.set(g.id, new Date(g.createdAt).toLocaleString()));
    return map;
  }, [items]);

  const toggleFavorite = useCallback(async (id: string) => {
    try {
      setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      const current = await listFavorites();
      if (current.includes(id)) await removeFavorite(id);
      else await addFavorite(id);
      Haptics.selectionAsync();
    } catch (error) {
      console.warn('[Archive] toggleFavorite failed', error);
    }
  }, []);

  const shareRows = useCallback(async (rows: GameRow[]) => {
    if (!rows.length) return;
    try {
      const clean = rows.filter(Boolean);
      const message = clean.map((r) => r.pgn || '').join('\n\n');
      const title = clean.length === 1 ? `${clean[0].whiteName || 'White'} vs ${clean[0].blackName || 'Black'}` : 'ChessMate games';
      await Share.share({ message, title });
      Haptics.selectionAsync();
    } catch {}
  }, []);

  const copyPGN = useCallback(async (game: GameRow) => {
    try {
      await Clipboard.setStringAsync(game.pgn || '');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast('PGN copied');
    } catch {}
  }, []);

  const scheduleDelete = useCallback(
    async (rows: GameRow[]) => {
      if (!rows.length) return;
      const clean = rows.filter(Boolean);
      const ids = clean.map((r) => r.id);
      const prevItems = items;
      const prevFavs = favorites;
      setItems((curr) => curr.filter((g) => !ids.includes(g.id)));
      setFavorites((curr) => curr.filter((id) => !ids.includes(id)));
      setSnackbar({
        message: rows.length === 1 ? 'Game deleted' : `${rows.length} games deleted`,
        actionLabel: 'Undo',
        onAction: () => {
          snackbarTimer.current && clearTimeout(snackbarTimer.current);
          setSnackbar(null);
          setItems(prevItems);
          setFavorites(prevFavs);
        },
      });

      snackbarTimer.current && clearTimeout(snackbarTimer.current);
      snackbarTimer.current = setTimeout(async () => {
        try {
          for (const row of rows) await deleteGame(row.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.warn('[Archive] delete finalization failed', error);
        }
        setSnackbar(null);
        snackbarTimer.current = null;
        fetchData();
      }, 3200);
    },
    [favorites, fetchData, items]
  );

  const toggleDetails = useCallback((id: string) => {
    startTransition(() => {
      setExpanded((prev) => {
        const nextId = prev.detailsId === id ? null : id;
        allowClipped.current = nextId === null;
        return { detailsId: nextId, fullDetails: nextId === null ? new Set() : prev.fullDetails };
      });
    });
  }, []);

  const toggleFullDetails = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev.fullDetails);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, fullDetails: next };
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openPreview = useCallback((game: GameRow) => {
    const { boardFen, lastMove, movesSan } = memoizeBoardState(game, fenCache, lastMoveCache, moveListCache);
    setPreview({ fen: boardFen, from: lastMove.from, to: lastMove.to, result: game.result });
    setShowPreview(true);
  }, []);

  const handleContext = useCallback(
    (game: GameRow) => {
      if (Platform.OS === 'ios') {
        const isFav = favorites.includes(game.id);
        const options = ['Share PGN', 'Copy PGN', isFav ? 'Unfavorite' : 'Favorite', 'Delete', 'Cancel'];
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: 4,
            destructiveButtonIndex: 3,
            userInterfaceStyle: activeTheme === 'dark' ? 'dark' : 'light',
          },
          async (idx) => {
            if (idx === 0) await shareRows([game]);
            else if (idx === 1) await copyPGN(game);
            else if (idx === 2) await toggleFavorite(game.id);
            else if (idx === 3) await scheduleDelete([game]);
          }
        );
      } else {
        setContextItem(game);
      }
    },
    [activeTheme, copyPGN, favorites, scheduleDelete, shareRows, toggleFavorite]
  );

  useEffect(() => {
    summarySV.value = withTiming(filtersDefault ? 0 : 1, { duration: reduceMotion ? 0 : 200 });
  }, [filtersDefault, reduceMotion, summarySV]);

  useEffect(() => {
    selectSV.value = withTiming(selectMode ? 1 : 0, { duration: reduceMotion ? 0 : 200 });
  }, [reduceMotion, selectMode, selectSV]);

  useEffect(() => {
    snackbarSV.value = withSpring(snackbar ? 1 : 0, { damping: 18, stiffness: 180 });
  }, [snackbar, snackbarSV]);

  const rowCallbacks = useMemo(
    () => ({
      onToggleFavorite: toggleFavorite,
      onToggleDetails: toggleDetails,
      onTogglePGN: toggleFullDetails,
      onSelect: toggleSelect,
      onShare: shareRows,
      onCopyPGN: copyPGN,
      onPreview: openPreview,
      onDelete: scheduleDelete,
      onContext: handleContext,
    }),
    [copyPGN, handleContext, openPreview, scheduleDelete, shareRows, toggleDetails, toggleFavorite, toggleFullDetails, toggleSelect]
  );

  const renderGameRow = useCallback(
    (game: GameRow) => {
    const { boardFen, lastMove, movesSan } = memoizeBoardState(game, fenCache, lastMoveCache, moveListCache);
    const personaPreset = game.coachEnabled ? resolvePersona(game.personaId ?? undefined) : null;
      return (
        <ArchiveRow
          key={game.id}
          game={game}
          palette={palette}
          activeTheme={activeTheme}
          highContrast={highContrast}
          selectMode={selectMode}
          selected={selected.has(game.id)}
          expanded={expanded.detailsId === game.id}
          showFull={expanded.fullDetails.has(game.id)}
          favorites={favorites}
          displayDate={displayDates.get(game.id) || ''}
          reduceMotion={reduceMotion}
          myName={myName}
          boardFen={boardFen}
          lastMove={lastMove}
          sanMoves={movesSan}
          coachPersona={personaPreset}
          coachEnabled={Boolean(game.coachEnabled)}
          {...rowCallbacks}
        />
      );
    },
    [
      activeTheme,
      displayDates,
      expanded.detailsId,
      expanded.fullDetails,
      favorites,
      highContrast,
      myName,
      palette,
      reduceMotion,
      rowCallbacks,
      selectMode,
      selected,
    ]
  );

  const renderFlatItem = useCallback(
    ({ item }: ListRenderItemInfo<FlatItem>) => {
      if (item.type === 'header') {
        return (
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
            <Text muted style={{ fontSize: 13 }}>{item.title}</Text>
          </View>
        );
      }
      return renderGameRow(item.game);
    },
    [renderGameRow]
  );

  const summaryStyle = useAnimatedStyle(() => ({
    opacity: summarySV.value,
    transform: [{ translateY: (1 - summarySV.value) * -12 }],
  }));

  const selectStyle = useAnimatedStyle(() => ({
    opacity: selectSV.value,
    transform: [{ translateY: (1 - selectSV.value) * 28 }],
  }));

  const snackbarStyle = useAnimatedStyle(() => ({
    opacity: snackbarSV.value,
    transform: [{ translateY: (1 - snackbarSV.value) * 16 }],
  }));

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetTranslate.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: sheetOpacity.value }));

  const openFilters = useCallback(() => {
    setShowFilters(true);
    setFiltersInteractive(true);
    sheetTranslate.value = sheetHeightSV.value;
    sheetOpacity.value = 0;
    requestAnimationFrame(() => {
      if (reduceMotion) {
        sheetTranslate.value = withTiming(0, { duration: 0 });
        sheetOpacity.value = withTiming(overlayMaxOpacity, { duration: 0 });
      } else {
        sheetTranslate.value = withSpring(0, sheetOpenSpring);
        sheetOpacity.value = withTiming(overlayMaxOpacity, { duration: 260, easing: Easing.out(Easing.quad) });
      }
    });
  }, [overlayMaxOpacity, reduceMotion, sheetOpenSpring, sheetOpacity, sheetTranslate, sheetHeightSV]);

  const closeFilters = useCallback(() => {
    setFiltersInteractive(false);
    if (reduceMotion) {
      sheetTranslate.value = withTiming(sheetHeightSV.value, { duration: 0 });
      sheetOpacity.value = withTiming(0, { duration: 0 }, () => runOnJS(setShowFilters)(false));
      return;
    }
    sheetOpacity.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) });
    sheetTranslate.value = withTiming(sheetHeightSV.value, { duration: 220, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) runOnJS(setShowFilters)(false);
    });
  }, [reduceMotion, sheetHeightSV, sheetOpacity, sheetTranslate]);

  const handleSheetLayout = useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    sheetHeight.current = height;
    sheetHeightSV.value = height;
    if (!showFilters) {
      sheetTranslate.value = height;
    }
  }, [showFilters, sheetHeight, sheetHeightSV, sheetTranslate]);

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          'worklet';
          gestureStart.value = sheetTranslate.value;
        })
        .onUpdate((event) => {
          'worklet';
          const next = gestureStart.value + event.translationY;
          sheetTranslate.value = next < 0 ? 0 : next;
          const ratio = sheetHeightSV.value <= 0 ? 0 : sheetTranslate.value / sheetHeightSV.value;
          sheetOpacity.value = Math.max(0, overlayMaxOpacity - ratio * overlayMaxOpacity);
        })
        .onEnd((event) => {
          'worklet';
          const shouldClose = event.translationY > sheetHeightSV.value * 0.45 || event.velocityY > 800;
          gestureStart.value = 0;
          if (shouldClose) {
            runOnJS(closeFilters)();
          } else {
            if (reduceMotion) {
              sheetTranslate.value = withTiming(0, { duration: 0 });
              sheetOpacity.value = withTiming(overlayMaxOpacity, { duration: 0 });
            } else {
              sheetTranslate.value = withSpring(0, sheetOpenSpring);
              sheetOpacity.value = withTiming(overlayMaxOpacity, { duration: 180, easing: Easing.out(Easing.quad) });
            }
          }
        })
        .onFinalize(() => {
          'worklet';
          gestureStart.value = 0;
        }),
    [gestureStart, overlayMaxOpacity, reduceMotion, sheetCloseSpring, sheetOpenSpring, setShowFilters, sheetOpacity, sheetTranslate, sheetHeightSV]
  );

  const topPadding = useMemo(() => {
    if (Platform.OS === 'ios') return 0;
    return insets.top + 12;
  }, [insets.top]);

  return (
    <>
      {Platform.OS === 'ios' ? (
        <SectionList
          sections={sectionData}
          keyExtractor={(item, index) => (item?.id ? String(item.id) : `section-item-${index}`)}
          renderItem={({ item }) => (item ? renderGameRow(item) : null)}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
              <Text muted style={{ fontSize: 13 }}>{section.title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={40}
          windowSize={10}
          removeClippedSubviews={!selectMode && !expanded.detailsId && allowClipped.current}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.primary]} tintColor={palette.primary} />}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 160, paddingTop: 0 }}
          contentInsetAdjustmentBehavior="automatic"
          scrollEventThrottle={16}
          ListHeaderComponent={
            <ArchiveHeader
              palette={palette}
              total={items.length}
              query={query}
              onChangeQuery={setQuery}
              filtersDefault={filtersDefault}
              onOpenFilters={openFilters}
            />
          }
          ListEmptyComponent={<EmptyState palette={palette} onPlay={() => router.push('/(tabs)/play')} />}
          ListFooterComponent={items.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={palette.primary as string} />
            </View>
          ) : null}
        />
      ) : (
        <FlashList
          ref={listRef}
          data={flatData}
          estimatedItemSize={ESTIMATED_ITEM_HEIGHT}
          renderItem={renderFlatItem}
          keyExtractor={(item) => item.key}
          stickyHeaderIndices={stickyIndices}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={10}
          updateCellsBatchingPeriod={40}
          getItemType={(item) => item.type}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.primary]} tintColor={palette.primary} />}
          ListHeaderComponent={
            <ArchiveHeader
              palette={palette}
              total={items.length}
              query={query}
              onChangeQuery={setQuery}
              filtersDefault={filtersDefault}
              onOpenFilters={openFilters}
            />
          }
          ListEmptyComponent={<EmptyState palette={palette} onPlay={() => router.push('/(tabs)/play')} />}
          onScrollBeginDrag={() => {
            labelTimer.current && clearTimeout(labelTimer.current);
            labelTimer.current = setTimeout(() => setScrollLabel(null), 1200);
          }}
          onMomentumScrollEnd={() => {
            labelTimer.current && clearTimeout(labelTimer.current);
            labelTimer.current = setTimeout(() => setScrollLabel(null), 800);
          }}
          ListFooterComponent={items.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={palette.primary as string} />
            </View>
          ) : null}
        />
      )}

      {!filtersDefault && (
        <Animated.View style={[styles.summaryBar, summaryStyle]} pointerEvents="box-none">
          <GlassCard>
            <View style={styles.summaryContent}>
              <Text style={{ color: palette.text, fontSize: 12 }}>Filters applied</Text>
              <Button
                title="Clear"
                tone="ghost"
                compact
                onPress={() => {
                  setFilters({ mode: 'all', result: 'any', sort: 'new', favoritesOnly: false });
                  setQuery('');
                }}
              />
            </View>
          </GlassCard>
        </Animated.View>
      )}

      <Animated.View style={[styles.selectionBar, selectStyle]} pointerEvents={selectMode ? 'auto' : 'none'}>
        {selectMode && (
          <SelectionBar
            palette={palette}
            count={selected.size}
            onFavorite={async () => {
              const ids = Array.from(selected);
              await addFavorites(ids);
              setSelectMode(false);
              setSelected(new Set());
              fetchData();
            }}
            onUnfavorite={async () => {
              const ids = Array.from(selected);
              await removeFavorites(ids);
              setSelectMode(false);
              setSelected(new Set());
              fetchData();
            }}
            onShare={() => {
              const rows = items.filter((g) => selected.has(g.id));
              shareRows(rows);
            }}
            onDelete={() => {
              const rows = items.filter((g) => selected.has(g.id));
              setSelectMode(false);
              setSelected(new Set());
              scheduleDelete(rows);
            }}
            onCancel={() => {
              setSelectMode(false);
              setSelected(new Set());
            }}
          />
        )}
      </Animated.View>

      <Animated.View style={[styles.snackbar, { bottom: Math.max(insets.bottom + 12, 24) }, snackbarStyle]} pointerEvents={snackbar ? 'auto' : 'none'}>
        {snackbar && (
          <GlassCard>
            <View style={styles.snackbarContent}>
              <Text style={{ color: '#FFFFFF' }}>{snackbar.message}</Text>
              {snackbar.actionLabel && snackbar.onAction && (
                <Pressable onPress={snackbar.onAction} hitSlop={8}>
                  <Text style={{ color: '#60A5FA', fontWeight: '700' }}>{snackbar.actionLabel}</Text>
                </Pressable>
              )}
            </View>
          </GlassCard>
        )}
      </Animated.View>

      {scrollLabel && (
        <View style={styles.scrollLabel}>
          <Text style={{ color: palette.text, fontWeight: '600' }}>{scrollLabel}</Text>
        </View>
      )}

      {showFilters && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]} pointerEvents="none" />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeFilters}
            disabled={!filtersInteractive}
            pointerEvents={filtersInteractive ? 'auto' : 'none'}
          />
          <GestureDetector gesture={dragGesture} enabled={filtersInteractive}>
            <Animated.View
              onLayout={handleSheetLayout}
              style={[sheetStyle, { position: 'absolute', left: 0, right: 0, bottom: 0 }]}
              pointerEvents={filtersInteractive ? 'auto' : 'none'}
            >
              <FiltersSheet
                palette={palette}
                activeTheme={activeTheme}
                filters={filters}
                onChange={setFilters}
                onClose={closeFilters}
                insets={insets}
              />
            </Animated.View>
          </GestureDetector>
        </View>
      )}

      {contextItem && Platform.OS === 'android' && (
        <ContextSheet
          palette={palette}
          item={contextItem}
          onFavorite={() => toggleFavorite(contextItem.id)}
          onShare={() => shareRows([contextItem])}
          onCopy={() => copyPGN(contextItem)}
          onDelete={() => scheduleDelete([contextItem])}
          onClose={() => setContextItem(null)}
        />
      )}

      {showPreview && preview && (
        <PreviewModal palette={palette} preview={preview} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}

const ArchiveRow = React.memo(function ArchiveRow(props: {
  game: GameRow;
  palette: any;
  activeTheme: ThemeName;
  highContrast: boolean;
  selectMode: boolean;
  selected: boolean;
  expanded: boolean;
  showFull: boolean;
  favorites: string[];
  displayDate: string;
  onToggleFavorite: (id: string) => void;
  onToggleDetails: (id: string) => void;
  onTogglePGN: (id: string) => void;
  onSelect: (id: string) => void;
  onShare: (rows: GameRow[]) => void;
  onCopyPGN: (game: GameRow) => void;
  onPreview: (game: GameRow) => void;
  onDelete: (rows: GameRow[]) => void;
  onContext: (game: GameRow) => void;
  reduceMotion: boolean;
  myName: string;
  boardFen: string;
  lastMove: { from: string | null; to: string | null };
  sanMoves: string[];
  coachPersona: PersonaPreset | null;
  coachEnabled: boolean;
}) {
  const {
    game,
    palette,
    activeTheme,
    highContrast,
    selectMode,
    selected,
    expanded,
    showFull,
    favorites,
    displayDate,
    onToggleFavorite,
    onToggleDetails,
    onTogglePGN,
    onSelect,
    onShare,
    onCopyPGN,
    onPreview,
    onDelete,
    onContext,
    reduceMotion,
    myName,
    boardFen,
    lastMove,
    sanMoves,
    coachPersona,
    coachEnabled,
  } = props;

  const pressSV = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressSV.value }] }));
  const isFavorite = favorites.includes(game.id) || game.is_favorite;

  const handlePress = useCallback(() => {
    if (selectMode) {
      onSelect(game.id);
      return;
    }
    Haptics.selectionAsync();
    onToggleDetails(game.id);
  }, [game.id, onSelect, onToggleDetails, selectMode]);

  const handleLongPress = useCallback(() => {
    if (selectMode) onSelect(game.id);
    else onContext(game);
  }, [game, onContext, onSelect, selectMode]);

  const summary = useMemo(() => computeOutcome(myName, game, palette, activeTheme), [activeTheme, game, myName, palette]);

  return (
    <AnimatedCard
      layout={Layout.springify({ damping: 20, stiffness: 240 })}
      style={{
        marginBottom: 12,
        borderRadius: 18,
        padding: 16,
        borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
        borderColor: selected ? palette.primary : highContrast ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={220}
        onPressIn={() => {
          pressSV.value = withTiming(0.97, { duration: reduceMotion ? 0 : 90 });
        }}
        onPressOut={() => {
          pressSV.value = withTiming(1, { duration: reduceMotion ? 0 : 120 });
        }}
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        <Animated.View style={[{ flex: 1, gap: 4 }, pressStyle]}>
          <Text style={{ fontSize: 16, fontWeight: '600' }} numberOfLines={1} ellipsizeMode="tail">
            {formatName(game.whiteName, myName)} vs {formatName(game.blackName, myName)}
          </Text>
          <Text muted style={{ fontSize: 13 }}>
            {displayDate} • {modeLabel(game.mode)} • {game.moves} moves
          </Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isFavorite && <Badge label="★" tint={tintWithAlpha(palette.accent as any, 0.24, activeTheme)} textColor={palette.text} />}
          {summary && <OutcomeBadge label={summary.label} color={summary.color} />}
          <Badge label={resultShort(game.result)} tint={badgeTint(game.result, palette, activeTheme)} textColor={activeTheme === 'dark' ? '#111' : '#111'} />
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.muted as any} />
        </View>
      </Pressable>

      {expanded && (
        <Animated.View
          entering={FadeInDown.springify({ damping: 18, stiffness: 280 })}
          exiting={FadeOutUp.springify({ damping: 16, stiffness: 240 })}
          layout={Layout.springify({ damping: 20, stiffness: 240 })}
          style={{
            marginTop: 18,
            borderRadius: 18,
            padding: 16,
            backgroundColor: highContrast ? 'rgba(20,20,24,0.9)' : 'rgba(118,106,200,0.12)',
            gap: 16,
          }}
        >
          <Pressable
            onPress={() => onPreview(game)}
            style={{ alignSelf: 'center', borderRadius: 20, overflow: 'hidden', backgroundColor: highContrast ? 'rgba(255,255,255,0.08)' : 'rgba(32,32,48,0.28)' }}
          >
            <BoardSkia
              fen={boardFen}
              size={136}
              onMove={() => {}}
              enabled={false}
              lastFrom={lastMove.from || undefined}
              lastTo={lastMove.to || undefined}
            />
          </Pressable>

          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: palette.text }}>Match summary</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              <Chip label={summary?.label ?? resultShort(game.result)} tone={summary ? 'success' : 'neutral'} />
              <Chip label={modeLabel(game.mode)} />
              <Chip label={`${game.moves} moves`} />
              <Chip label={displayDate} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
            <ActionChip label="Share" onPress={() => onShare([game])} />
            <ActionChip label={isFavorite ? 'Unfavorite' : 'Favorite'} onPress={() => onToggleFavorite(game.id)} />
            <ActionChip label="Copy PGN" onPress={() => onCopyPGN(game)} />
            <ActionChip label="Delete" tone="danger" onPress={() => onDelete([game])} />
          </View>

          {showFull && (
            <View style={{ gap: 16 }}>
              {sanMoves.length > 0 && <MoveStrip moves={sanMoves} accent={palette.primary as string} />}
              {coachEnabled && coachPersona && (
                <CoachCapsule persona={coachPersona} accent={palette.primary as string} highContrast={highContrast} />
              )}
              <ScrollView
                style={{
                  maxHeight: 220,
                  borderRadius: 14,
                  backgroundColor: highContrast ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                  padding: 14,
                }}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                <Text style={{ fontFamily: 'Menlo', fontSize: 13, color: palette.text }}>
                  {game.pgn?.trim() || 'No PGN available.'}
                </Text>
              </ScrollView>
            </View>
          )}

          {!showFull && (
            <Pressable
              onPress={() => onTogglePGN(game.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                paddingHorizontal: 18,
                borderRadius: 14,
                backgroundColor: highContrast ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: palette.text }}>
                View details
              </Text>
              <Ionicons name="chevron-down" size={18} color={palette.muted as any} />
            </Pressable>
          )}
        </Animated.View>
      )}
    </AnimatedCard>
  );
});

function formatName(name: string | null | undefined, myName: string) {
  if (!name) return 'Guest';
  if (!myName) return name.trim();
  const norm = (val: string) => val.toLowerCase().replace(/\s+/g, '');
  const trimmed = name.trim();
  if (norm(trimmed).includes(norm(myName)) && !trimmed.startsWith('(me)')) {
    return `(me) ${trimmed}`;
  }
  return trimmed;
}

function computeOutcome(myName: string, game: GameRow, palette: any, theme: ThemeName) {
  const normalize = (s?: string) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const me = normalize(myName);
  if (!me) return null;
  const white = normalize(game.whiteName);
  const black = normalize(game.blackName);
  const match = (a: string, b: string) => !!a && !!b && (a === b || a.includes(b) || b.includes(a));
  const meIsWhite = match(me, white);
  const meIsBlack = match(me, black);
  if (!meIsWhite && !meIsBlack) return null;
  const r = game.result;
  const isWin = (meIsWhite && r === '1-0') || (meIsBlack && r === '0-1');
  const isLoss = (meIsWhite && r === '0-1') || (meIsBlack && r === '1-0');
  if (isWin) return { label: 'Win', color: tintWithAlpha('#34C759', 0.26, theme) };
  if (isLoss) return { label: 'Loss', color: tintWithAlpha('#FF3B30', 0.26, theme) };
  return { label: 'Draw', color: tintWithAlpha(palette.muted as any, 0.22, theme) };
}

function ArchiveHeader({
  palette,
  total,
  query,
  onChangeQuery,
  filtersDefault,
  onOpenFilters,
}: {
  palette: any;
  total: number;
  query: string;
  onChangeQuery: (value: string) => void;
  filtersDefault: boolean;
  onOpenFilters: () => void;
}) {
  return (
    <View style={{ width: '100%', alignSelf: 'center', gap: 12, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: palette.card,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 44,
          }}
        >
          <Ionicons name="search" size={20} color={palette.muted as any} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Search games..."
            placeholderTextColor={palette.muted as any}
            style={{ flex: 1, color: palette.text, fontSize: 16 }}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity
          onPress={onOpenFilters}
          style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.card }}
          accessibilityRole="button"
          accessibilityLabel="Filter archive games"
          accessibilityHint="Opens the filters sheet"
        >
          <Ionicons name="funnel-outline" size={20} color={palette.primary} />
          {!filtersDefault && <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary }} />}
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text muted style={{ fontSize: 13 }}>
          {total} {total === 1 ? 'result' : 'results'}
        </Text>
      </View>
    </View>
  );
}

function FiltersSheet({
  palette,
  activeTheme,
  filters,
  onChange,
  onClose,
  insets,
}: {
  palette: any;
  activeTheme: ThemeName;
  filters: Filters;
  onChange: (next: Filters) => void;
  onClose: () => void;
  insets: ReturnType<typeof useSafeAreaInsets>;
}) {
  return (
    <View
      style={{
        backgroundColor: palette.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        width: '100%',
        maxHeight: '92%',
        paddingBottom: Math.max(insets.bottom + 12, 20),
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -6 },
      }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, alignItems: 'center', gap: 10 }}>
        <View style={{ width: 44, height: 6, borderRadius: 3, backgroundColor: activeTheme === 'dark' ? '#3A3A3C' : '#E5E5EA' }} />
        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 18 }}>Filters</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <FilterGroup
          title="Game Mode"
          value={filters.mode}
          options={[
            { id: 'all', label: 'All' },
            { id: 'online', label: 'Online' },
            { id: 'ai', label: 'VS AI' },
            { id: 'local', label: 'Local' },
          ]}
          palette={palette}
          activeTheme={activeTheme}
          onChange={(value) => onChange({ ...filters, mode: value as Filters['mode'] })}
        />
        <FilterGroup
          title="Result"
          value={filters.result}
          options={[
            { id: 'any', label: 'Any' },
            { id: '1-0', label: 'Won' },
            { id: '0-1', label: 'Lost' },
            { id: '1/2-1/2', label: 'Draw' },
          ]}
          palette={palette}
          activeTheme={activeTheme}
          onChange={(value) => onChange({ ...filters, result: value as Filters['result'] })}
        />
        <FilterGroup
          title="Sort"
          value={filters.sort}
          options={[
            { id: 'new', label: 'Newest' },
            { id: 'old', label: 'Oldest' },
            { id: 'moves', label: 'Move count' },
          ]}
          palette={palette}
          activeTheme={activeTheme}
          onChange={(value) => onChange({ ...filters, sort: value as Filters['sort'] })}
        />
        <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: palette.text, fontWeight: '600', fontSize: 14 }}>Favorites only</Text>
          <Switch value={filters.favoritesOnly} onValueChange={(value) => onChange({ ...filters, favoritesOnly: value })} />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16 }}>
        <Button title="Done" onPress={onClose} tone="primary" />
      </View>
    </View>
  );
}

function FilterGroup({
  title,
  value,
  options,
  palette,
  activeTheme,
  onChange,
}: {
  title: string;
  value: string;
  options: { id: string; label: string }[];
  palette: any;
  activeTheme: ThemeName;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ marginVertical: 12 }}>
      <Text style={{ color: palette.text, fontWeight: '600', fontSize: 14, marginBottom: 10 }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => onChange(opt.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 18,
                borderWidth: active ? 1.4 : StyleSheet.hairlineWidth,
                borderColor: active ? palette.primary : activeTheme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)',
                backgroundColor: active
                  ? tintWithAlpha(palette.primary as any, 0.16, activeTheme)
                  : tintWithAlpha('rgba(0,0,0,1)', 0.03, activeTheme),
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}
            >
              <Text style={{ color: active ? palette.primary : palette.text }}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SelectionBar({
  palette,
  count,
  onFavorite,
  onUnfavorite,
  onShare,
  onDelete,
  onCancel,
}: {
  palette: any;
  count: number;
  onFavorite: () => void;
  onUnfavorite: () => void;
  onShare: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <GlassCard>
      <View style={styles.selectionContent}>
        <Text style={{ color: palette.text, fontWeight: '600' }}>{count} selected</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <ActionChip label="Favorite" onPress={onFavorite} />
          <ActionChip label="Unfavorite" onPress={onUnfavorite} />
          <ActionChip label="Share" onPress={onShare} />
          <ActionChip label="Delete" tone="danger" onPress={onDelete} />
          <ActionChip label="Cancel" tone="muted" onPress={onCancel} />
        </View>
      </View>
    </GlassCard>
  );
}

function ContextSheet({
  palette,
  item,
  onFavorite,
  onShare,
  onCopy,
  onDelete,
  onClose,
}: {
  palette: any;
  item: GameRow;
  onFavorite: () => void;
  onShare: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={{ backgroundColor: palette.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Game actions</Text>
        <ContextRow label={item.is_favorite ? 'Unfavorite' : 'Favorite'} onPress={() => { onFavorite(); onClose(); }} palette={palette} />
        <ContextRow label="Share PGN" onPress={() => { onShare(); onClose(); }} palette={palette} />
        <ContextRow label="Copy PGN" onPress={() => { onCopy(); onClose(); }} palette={palette} />
        <ContextRow label="Delete" tone="danger" onPress={() => { onDelete(); onClose(); }} palette={palette} />
        <View style={{ paddingTop: 6, alignItems: 'flex-end' }}>
          <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
            <Text style={{ color: palette.muted }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ContextRow({
  label,
  onPress,
  palette,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  palette: any;
  tone?: 'default' | 'danger';
}) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingVertical: 12 }}>
      <Text style={{ color: tone === 'danger' ? '#FF453A' : palette.text, fontSize: 15 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function PreviewModal({ palette, preview, onClose }: { palette: any; preview: PreviewState; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={{ backgroundColor: palette.card, padding: 16, borderRadius: 20, alignItems: 'center', gap: 12 }}>
          <BoardSkia
            fen={safeFen(preview.fen)}
            size={Math.min(Dimensions.get('window').width - 48, 320)}
            onMove={() => {}}
            enabled={false}
            lastFrom={preview.from || undefined}
            lastTo={preview.to || undefined}
          />
          {preview.result && (
            <Text style={{ color: preview.result === '1-0' ? '#34C759' : preview.result === '0-1' ? '#FF3B30' : palette.text, fontWeight: '700' }}>
              {preview.result}
            </Text>
          )}
          <Button title="Close" onPress={onClose} tone="primary" compact />
        </View>
      </View>
    </Modal>
  );
}

function EmptyState({ palette, onPlay }: { palette: any; onPlay: () => void }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
      <Ionicons name="archive-outline" size={48} color={palette.muted as any} />
      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 12, color: palette.text }}>No games saved</Text>
      <Text muted style={{ textAlign: 'center', marginTop: 6 }}>
        Your completed games will appear here.
      </Text>
      <Button title="Play a game" onPress={onPlay} style={{ marginTop: 16 }} />
    </View>
  );
}

function ActionChip({ label, onPress, tone = 'default' }: { label: string; onPress: () => void; tone?: 'default' | 'muted' | 'danger' }) {
  const background = tone === 'danger' ? 'rgba(255,69,58,0.16)' : tone === 'muted' ? 'rgba(120,120,128,0.16)' : 'rgba(124,77,255,0.16)';
  const color = tone === 'danger' ? '#FF453A' : tone === 'muted' ? '#8E8E93' : '#7C4DFF';
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: background }}>
      <Text style={{ color, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Badge({ label, tint, textColor }: { label: string; tint: string; textColor: string | undefined }) {
  return (
    <View
      style={{
        minWidth: 28,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: tint,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: textColor ?? '#111', fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function OutcomeBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: color }}>
      <Text style={{ color: '#111', fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={30} tint="dark" style={{ borderRadius: 18, overflow: 'hidden' }}>
        {children}
      </BlurView>
    );
  }
  return (
    <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(28,28,30,0.82)' }}>{children}</View>
  );
}

const styles = StyleSheet.create({
  summaryBar: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
  },
  selectionContent: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  snackbar: {
    position: 'absolute',
    left: 18,
    right: 18,
  },
  snackbarContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  scrollLabel: {
    position: 'absolute',
    right: 12,
    top: 110,
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  overlay: {
    backgroundColor: '#000',
  },
});
