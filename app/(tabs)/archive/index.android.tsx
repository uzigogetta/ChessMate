import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, SectionList, Share, Alert, Pressable, TouchableOpacity, RefreshControl, TextInput, Modal, Animated as RNAnimated, Easing, Platform, PanResponder, LayoutChangeEvent, Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import RAnimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Layout, FadeIn, FadeOut } from 'react-native-reanimated';
import { applySANs, fenToBoard } from '@/features/chess/logic/chess.rules';
import BoardSkia from '@/features/chess/components/board/BoardSkia';

function Expandable({ expanded, children }: { expanded: boolean; children: React.ReactNode }) {
  const measured = React.useRef(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    const targetH = expanded ? measured.current : 0;
    const targetO = expanded ? 1 : 0;
    height.value = withTiming(targetH, { duration: expanded ? 180 : 160 });
    opacity.value = withTiming(targetO, { duration: expanded ? 160 : 140 });
    scale.value = 1;
  }, [expanded]);

  const animatedStyle = useAnimatedStyle(() => ({ height: height.value, opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <RAnimated.View layout={Layout.duration(160)} style={[{ overflow: 'hidden' }, animatedStyle]}>
      <RAnimated.View
        onLayout={(e) => {
          measured.current = e.nativeEvent.layout.height;
          // Ensure we show content immediately if already expanded when first measured
          if (expanded) {
            height.value = measured.current;
            opacity.value = 1;
          }
        }}
        entering={FadeIn.duration(140)}
        exiting={FadeOut.duration(120)}
      >
        {children}
      </RAnimated.View>
    </RAnimated.View>
  );
}

function Chevron({ expanded, color }: { expanded: boolean; color: any }) {
  const rot = useSharedValue(expanded ? 90 : 0);
  React.useEffect(() => {
    rot.value = withSpring(expanded ? 90 : 0, { damping: 14, stiffness: 170, mass: 0.25 });
  }, [expanded]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <RAnimated.View style={[{ marginLeft: 8 }, style]}>
      <Ionicons name="chevron-forward" size={18} color={color} />
    </RAnimated.View>
  );
}

function getLastMovesFromPGN(pgn?: string, count: number = 4): string | null {
  if (!pgn) return null;
  try {
    // Strip comments and move numbers
    const cleaned = pgn
      .replace(/\{[^}]*\}/g, ' ') // comments
      .replace(/\d+\.(\.\.)?/g, ' ') // move numbers
      .replace(/\s+/g, ' ') // extra spaces
      .trim();
    const tokens = cleaned.split(' ');
    const sans = tokens.filter((t) => !/(1-0|0-1|1\/2-1\/2|\*)/.test(t));
    const last = sans.slice(-count);
    return last.join(' ');
  } catch {
    return null;
  }
}

function parseSANs(pgn?: string): string[] | null {
  if (!pgn) return null;
  try {
    const cleaned = pgn
      // headers like [Event "..."]
      .replace(/\[[^\]]*\]/g, ' ')
      // comments { ... }
      .replace(/\{[^}]*\}/g, ' ')
      // parentheses comments ( .. )
      .replace(/\([^)]*\)/g, ' ')
      // move numbers 1. / 12... etc
      .replace(/\d+\.(\.\.)?/g, ' ')
      // newlines to spaces
      .replace(/\s+/g, ' ')
      .trim();
    const tokens = cleaned.split(' ');
    const rawSans = tokens.filter((t) => t && !/(1-0|0-1|1\/2-1\/2|\*)/.test(t));
    // strip annotations like +, #, !, ? from SAN tokens (sloppy mode usually handles them but be safe)
    const sans = rawSans.map((t) => t.replace(/[+#!?]+/g, ''));
    return sans;
  } catch {
    return null;
  }
}

function MiniBoard({ pgn, result }: { pgn?: string; result?: string }) {
  const [fen, setFen] = React.useState<string>('');
  React.useEffect(() => {
    (async () => {
      const sans = parseSANs(pgn || '') || [];
      try {
        const f = await applySANs(sans);
        setFen(f);
      } catch {
        setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      }
    })();
  }, [pgn]);
  const resColor = result === '1-0' ? '#16a34a' : result === '0-1' ? '#ef4444' : '#64748b';
  const lastMoveSquares = React.useMemo(()=>{
    const sans = parseSANs(pgn || '') || [];
    const last = sans.slice(-1)[0];
    if (!last) return { from: null as any, to: null as any };
    try {
      const { chess } = fenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      for (const s of sans) { chess.move(s, { sloppy: true } as any); }
      const hist: any = (chess as any).history({ verbose: true });
      const h = hist[hist.length - 1];
      return { from: h?.from || null, to: h?.to || null };
    } catch { return { from: null as any, to: null as any }; }
  }, [pgn]);

  return (
    <View style={{ alignItems: 'center' }}>
      <BoardSkia fen={fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'} onMove={()=>{}} enabled={false} size={140} lastFrom={lastMoveSquares.from} lastTo={lastMoveSquares.to} />
      {result && (
        <Text style={{ color: resColor, marginTop: 6, fontWeight: '600' }}>{result}</Text>
      )}
    </View>
  );
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import { getJSON, setJSON, KEYS } from '@/features/storage/mmkv';
import { themes, ThemeName, getTheme } from '@/ui/tokens';
import { Card, Text as AppText, Button } from '@/ui/atoms';
import { AndroidPalette } from '@/ui/androidColors';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable, RectButton, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

export default function ArchiveListScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const sectionListRef = useRef<SectionList<any>>(null as any);
  const [scrollLabel, setScrollLabel] = useState<string | null>(null);
  const labelTimer = useRef<NodeJS.Timeout | null>(null);
  const [showScroller, setShowScroller] = useState<boolean>(false);
  const [trackH, setTrackH] = useState<number>(0);
  const [thumbY, setThumbY] = useState<number>(0);
  const lastHapticSection = useRef<number>(-1);
  const [zoom, setZoom] = useState<{ fen: string; from?: string|null; to?: string|null; result?: string|null } | null>(null);

  const onTrackLayout = (e: LayoutChangeEvent) => setTrackH(e.nativeEvent.layout.height);
  const jumpToSection = (y: number) => {
    if (!trackH || sections.length === 0) return;
    const clamped = Math.max(0, Math.min(trackH, y));
    const idx = Math.max(0, Math.min(sections.length - 1, Math.floor((clamped / trackH) * sections.length)));
    setThumbY(clamped);
    setScrollLabel(sections[idx]?.title || null);
    try {
      sectionListRef.current?.scrollToLocation({ sectionIndex: idx, itemIndex: 0, animated: false, viewPosition: 0 });
    } catch {}
    if (idx !== lastHapticSection.current) {
      lastHapticSection.current = idx;
      try { Haptics.selectionAsync(); } catch {}
    }
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setShowScroller(true);
        const y = evt.nativeEvent.locationY;
        jumpToSection(y);
      },
      onPanResponderMove: (evt) => {
        const y = evt.nativeEvent.locationY;
        jumpToSection(y);
      },
      onPanResponderRelease: () => {
        setTimeout(() => setShowScroller(false), 400);
        setTimeout(() => setScrollLabel(null), 800);
      }
    })
  ).current;
  const [snackbar, setSnackbar] = useState<{ message: string; actionLabel?: string; onAction?: () => void } | null>(null);
  const snackbarTimer = useRef<NodeJS.Timeout | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const rowRefs = useRef<Record<string, any>>({});
  const [contextItem, setContextItem] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'online' | 'ai' | 'local'>('all');
  const [filterResult, setFilterResult] = useState<'any' | '1-0' | '0-1' | '1/2-1/2'>('any');
  const [sortOrder, setSortOrder] = useState<'new' | 'old'>('new');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const sheetY = useRef(new RNAnimated.Value(300)).current;
  const sheetYVal = useRef(300);
  useEffect(() => {
    const id = sheetY.addListener(({ value }) => { sheetYVal.current = value; });
    return () => sheetY.removeListener(id);
  }, [sheetY]);
  const overlayOpacity = sheetY.interpolate({ inputRange: [0, 300], outputRange: [0.6, 0], extrapolate: 'clamp' });
  const insets = useSafeAreaInsets();

  // Load persisted filters once
  useEffect(() => {
    const saved = getJSON<any>(KEYS.archiveFilters);
    if (saved) {
      if (saved.filterMode) setFilterMode(saved.filterMode);
      if (saved.filterResult) setFilterResult(saved.filterResult);
      if (saved.sortOrder) setSortOrder(saved.sortOrder);
      if (typeof saved.favoritesOnly === 'boolean') setFavoritesOnly(saved.favoritesOnly);
    }
  }, []);

  // Persist filters when they change
  useEffect(() => {
    setJSON(KEYS.archiveFilters, { filterMode, filterResult, sortOrder, favoritesOnly });
  }, [filterMode, filterResult, sortOrder, favoritesOnly]);

  const isDefaultFilters = useMemo(() => {
    return (
      filterMode === 'all' &&
      filterResult === 'any' &&
      sortOrder === 'new' &&
      favoritesOnly === false
    );
  }, [filterMode, filterResult, sortOrder, favoritesOnly]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filterMode !== 'all') n += 1;
    if (filterResult !== 'any') n += 1;
    if (sortOrder !== 'new') n += 1;
    if (favoritesOnly) n += 1;
    return n;
  }, [filterMode, filterResult, sortOrder, favoritesOnly]);
  const router = useRouter();
  const sys = useColorScheme();
  const settingsVals = useSettings();
  const mode = settingsVals.theme as 'system'|'light'|'dark';
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = getTheme(active, { highContrast: settingsVals.highContrast });

  const fetchData = useCallback(async () => {
    try {
      setLoadError(null);
      const db = await import('@/archive/db');
      await db.init();
      const rows = await db.listGames({ 
        mode: (filterMode === 'online' ? '1v1' : filterMode) as any, 
        result: filterResult, 
        sort: sortOrder, 
        favoritesOnly: favoritesOnly, 
        query: searchQuery 
      });
      setItems(rows);
      // group into sections by date
      const grouped: Record<string, any[]> = {};
      for (const r of rows) {
        const d = new Date(r.createdAt);
        const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
      }
      const makeTitle = (key: string) => {
        const [y,m,day] = key.split('-').map((s)=>parseInt(s,10));
        const d = new Date(y, m-1, day);
        const today = new Date();
        const yest = new Date(); yest.setDate(today.getDate()-1);
        const same = (a: Date,b: Date)=> a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
        if (same(d,today)) return 'Today';
        if (same(d,yest)) return 'Yesterday';
        return d.toLocaleDateString();
      };
      const secs = Object.keys(grouped)
        .sort((a,b)=> a<b ? 1 : -1)
        .map((k)=>({ title: makeTitle(k), data: grouped[k] }));
      setSections(secs);
    } catch (error) {
      const msg = String((error as any)?.message || error);
      console.error('[Archive] fetchData error:', msg);
      setLoadError(msg);
      setItems([]);
    }
  }, [searchQuery, filterMode, filterResult, sortOrder, favoritesOnly]);

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => fetchData(), 50);
      return () => clearTimeout(timer);
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const openFilters = useCallback(async () => {
    setShowFilters(true);
    sheetY.setValue(300);
    try { (router as any).setParams?.({ hideTabs: true }); } catch {}
    (globalThis as any).__HIDE_TABS__ = true;
    // Optional: adjust system nav bar (skip if module not available)
    RNAnimated.timing(sheetY, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sheetY]);

  const closeFilters = useCallback(async () => {
    RNAnimated.timing(sheetY, {
      toValue: 300,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setShowFilters(false);
      try { (router as any).setParams?.({ hideTabs: false }); } catch {}
      (globalThis as any).__HIDE_TABS__ = false;
    });
    // Optional: restore system nav bar (skipped if module not available)
  }, [sheetY]);

  // Drag-to-dismiss on the sheet header/handle
  const dragStartY = useRef(0);
  const sheetPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gesture) => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        dragStartY.current = sheetYVal.current;
      },
      onPanResponderMove: (_, gesture) => {
        const next = Math.max(0, Math.min(300, dragStartY.current + gesture.dy));
        sheetY.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldClose = sheetYVal.current > 140 || gesture.vy > 1.2;
        if (shouldClose) {
          closeFilters();
        } else {
          RNAnimated.spring(sheetY, { toValue: 0, friction: 7, tension: 140, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        RNAnimated.spring(sheetY, { toValue: 0, friction: 7, tension: 140, useNativeDriver: true }).start();
      }
    })
  ).current;

  const hideTabs = useCallback((hide: boolean) => {
    try { (router as any).setParams?.({ hideTabs: hide }); } catch {}
    (globalThis as any).__HIDE_TABS__ = hide;
  }, [router]);

  const settings = useSettings();
  const handleFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    try { if (settingsVals.haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    // Optimistic update
    setItems((prev) => prev.map((g) => (g.id === id ? { ...g, is_favorite: !isFavorite } : g)));
    if (favoritesOnly && isFavorite) {
      // If we are filtering by favorites and user unfavorites, remove it immediately
      setItems((prev) => prev.filter((g) => g.id !== id));
    }
    setSnackbar({ message: isFavorite ? 'Removed from favorites' : 'Added to favorites' });
    setTimeout(() => setSnackbar(null), 1200);
    try {
      const db = await import('@/archive/db');
      if (isFavorite) await db.removeFavorite(id);
      else await db.addFavorite(id);
      // Sync from DB to refresh sections accurately
      await fetchData();
    } catch (error) {
      console.error('[Archive] Toggle favorite error:', error);
    }
  }, [fetchData, favoritesOnly, settingsVals.haptics]);

  const handleDelete = useCallback(async (id: string) => {
    if (settingsVals.haptics) { try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {} }
    try {
      const db = await import('@/archive/db');
      const item = items.find((g)=>g.id===id);
      await db.deleteGame(id);
      await fetchData();
      if (snackbarTimer.current) { clearTimeout(snackbarTimer.current); }
      setSnackbar({
        message: 'Game deleted',
        actionLabel: 'Undo',
        onAction: async () => {
          try {
            await db.insertGame(item);
            if (item?.is_favorite) await db.addFavorite(item.id);
            await fetchData();
          } catch {}
        }
      });
      snackbarTimer.current = setTimeout(()=> setSnackbar(null), 3500);
    } catch (error) {
      console.error('[Archive] Delete game error:', error);
    }
  }, [fetchData, items]);

  const renderRightActions = (progress: any, dragX: any, item: any) => {
    return (
      <View style={{ flexDirection: 'row', width: 180, marginBottom: 8 }}>
        <RectButton
          style={{
            flex: 1,
            backgroundColor: item.is_favorite ? '#16a34a' : '#FFB800',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => handleFavorite(item.id, item.is_favorite)}
        >
          <Ionicons
            name={item.is_favorite ? "checkmark" : "star-outline"}
            size={24}
            color="#FFFFFF"
          />
          <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4 }}>
            {item.is_favorite ? 'Saved' : 'Favorite'}
          </Text>
        </RectButton>
        <RectButton
          style={{
            flex: 1,
            backgroundColor: '#dc2626',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4 }}>Delete</Text>
        </RectButton>
      </View>
    );
  };

  const openContextMenu = (item: any) => { hideTabs(true); setContextItem(item); };

  const shareCardImage = useCallback(async (id: string) => {
    try {
      const view = rowRefs.current[id];
      if (!view) return;
      // Lazy import view-shot at runtime; skip if not available
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { captureRef } = require('react-native-view-shot');
      const uri: string = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
      let shareUri = uri;
      if (Platform.OS === 'android') {
        try {
          shareUri = await FileSystem.getContentUriAsync(uri);
        } catch {}
      }
      await Share.share({ url: shareUri, message: 'Chess game' });
    } catch (e) {
      console.warn('Share image failed', e);
      setSnackbar({ message: 'Share image failed' });
      setTimeout(()=> setSnackbar(null), 1500);
    }
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <Swipeable
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
      overshootRight={false}
    >
      {(() => {
        const pressSV = useSharedValue(1);
        const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressSV.value }] }));
        return (
      <TouchableOpacity
        onPress={async () => {
          if (settingsVals.haptics) { try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} }
          setExpanded((prev)=> ({ ...prev, [item.id]: !prev[item.id] }));
        }}
        onLongPress={() => openContextMenu(item)}
        style={{ marginBottom: 8 }}
        activeOpacity={1}
        onPressIn={() => { pressSV.value = withTiming(0.98, { duration: 90 }); }}
        onPressOut={() => { pressSV.value = withTiming(1, { duration: 110 }); }}
      >
        <View ref={(ref: any)=> { if (ref) rowRefs.current[item.id] = ref; }}>
          <RAnimated.View style={pressStyle}>
          <Card style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText style={{ fontSize: 16 }}>
                {`${item.whiteName || 'White'} vs ${item.blackName || 'Black'}`}
              </AppText>
              <AppText muted style={{ fontSize: 13 }}>
                {`${new Date(item.createdAt).toLocaleDateString()} • ${item.mode} • ${item.moves} moves`}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: (item.result === '1-0' ? '#16a34a' : item.result === '0-1' ? '#ef4444' : '#f59e0b') }}>
                {item.result === '1-0' ? 'W' : item.result === '0-1' ? 'L' : 'D'}
              </Text>
              <View style={{ 
                backgroundColor: (item.result === '1-0' ? 'rgba(22,163,74,0.18)' : item.result === '0-1' ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.18)'), 
                borderRadius: 999, 
                paddingHorizontal: 8, 
                paddingVertical: 4 
              }}>
                <Text style={{ fontSize: 12, color: item.result === '1-0' ? '#16a34a' : item.result === '0-1' ? '#ef4444' : '#f59e0b' }}>
                  {item.result === '1/2-1/2' ? '½' : item.result}
                </Text>
              </View>
            </View>
            <Chevron expanded={!!expanded[item.id]} color={c.muted as string} />
          </View>

          <Expandable expanded={!!expanded[item.id]}>
            <View style={{ marginTop: 10, gap: 10 }}>
              <View style={{ height: 1, backgroundColor: active === 'dark' ? '#3A3A3C' : '#E5E5EA' }} />
              <Pressable onPress={() => {
                const sans = parseSANs(item.pgn || '') || [];
                (async ()=> {
                  try {
                    const f = await applySANs(sans);
                    const { chess } = fenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
                    for (const s of sans) { chess.move(s, { sloppy: true } as any); }
                    const hist: any = (chess as any).history({ verbose: true });
                    const h = hist[hist.length - 1] || {};
                    setZoom({ fen: f, from: h.from, to: h.to, result: item.result });
                  } catch {
                    setZoom({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', from: null, to: null, result: item.result });
                  }
                })();
              }} android_ripple={{ color: '#0000001A' }} style={{ backgroundColor: active === 'dark' ? '#141417' : '#F7F7FA', borderRadius: 12, padding: 10 }}>
                <Text style={{ color: c.muted as string, fontSize: 12 }}>Position</Text>
                <View style={{ height: 8 }} />
                <MiniBoard pgn={item.pgn} result={item.result} />
              </Pressable>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <TouchableOpacity onPress={() => openContextMenu(item)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: active === 'dark' ? '#1C1C1E' : '#EFEFF4' }}>
                  <Text style={{ color: c.text as string }}>More…</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleFavorite(item.id, item.is_favorite)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: item.is_favorite ? (c.primary as string) : (active === 'dark' ? '#1C1C1E' : '#EFEFF4') }}>
                  <Text style={{ color: item.is_favorite ? '#FFFFFF' : (c.text as string) }}>{item.is_favorite ? 'Unfavorite' : 'Favorite'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async ()=>{ try { await Share.share({ message: item.pgn || '' }); } catch {} }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: active === 'dark' ? '#1C1C1E' : '#EFEFF4' }}>
                  <Text style={{ color: c.text as string }}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => shareCardImage(item.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: active === 'dark' ? '#1C1C1E' : '#EFEFF4' }}>
                  <Text style={{ color: c.text as string }}>Share Image</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async ()=>{ try { await Clipboard.setStringAsync(item.pgn || ''); setSnackbar({ message: 'PGN copied' }); setTimeout(()=> setSnackbar(null), 1500); } catch {} }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: active === 'dark' ? '#1C1C1E' : '#EFEFF4' }}>
                  <Text style={{ color: c.text as string }}>Copy PGN</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push(`/archive/${item.id}`)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: active === 'dark' ? '#1C1C1E' : '#EFEFF4' }}>
                  <Text style={{ color: c.text as string }}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#fee2e2' }}>
                  <Text style={{ color: '#991b1b' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Expandable>
          </Card>
          </RAnimated.View>
        </View>
      </TouchableOpacity>
        ); })()}
    </Swipeable>
  );

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Archive' }} />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: c.background }}>
          {loadError && (
            <View style={{ padding: 12, backgroundColor: '#dc2626', margin: 12, borderRadius: 8 }}>
              <AppText style={{ color: '#FFFFFF' }}>Error: {loadError}</AppText>
            </View>
          )}
          
          
          <SectionList
          ref={sectionListRef as any}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ color: c.muted as string, fontWeight: '600' }}>{section.title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          onViewableItemsChanged={useRef(({ viewableItems }: any) => {
            const header = viewableItems.find((v: any) => v.index === null && v.isViewable && v.section?.title);
            if (header?.section?.title) setScrollLabel(header.section.title);
          }).current}
          onScrollBeginDrag={() => {
            if (labelTimer.current) clearTimeout(labelTimer.current);
            labelTimer.current = setTimeout(() => setScrollLabel(null), 1200);
          }}
          onMomentumScrollEnd={() => {
            if (labelTimer.current) clearTimeout(labelTimer.current);
            labelTimer.current = setTimeout(() => setScrollLabel(null), 800);
          }}
          contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[c.primary]}
              tintColor={c.primary}
            />
          }
          ListHeaderComponent={
            <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', gap: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ 
                  flex: 1,
                  flexDirection: 'row', 
                  alignItems: 'center',
                  backgroundColor: c.card, 
                  borderRadius: 12, 
                  paddingHorizontal: 12,
                  height: 44
                }}>
                  <Ionicons name="search" size={20} color={c.muted} style={{ marginRight: 8 }} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search games..."
                    placeholderTextColor={c.muted}
                    style={{ flex: 1, color: c.text, fontSize: 16 }}
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                  />
                </View>
                <TouchableOpacity
                  onPress={openFilters}
                  style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="funnel-outline" size={20} color={c.primary} />
                  {(filterMode !== 'all' || filterResult !== 'any' || sortOrder !== 'new' || favoritesOnly) && (
                    <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} />
                  )}
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText muted style={{ fontSize: 13 }}>
                  {items.length} {items.length === 1 ? 'result' : 'results'}
                </AppText>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <Ionicons name="archive-outline" size={48} color={c.muted} />
              <AppText style={{ fontSize: 18, fontWeight: '600', marginTop: 12 }}>
                No Games Saved
              </AppText>
              <AppText muted style={{ textAlign: 'center', marginTop: 4 }}>
                Your completed games will appear here.
              </AppText>
              <Button 
                title="Play a Game" 
                onPress={() => router.push('/(tabs)/play')} 
                style={{ marginTop: 16 }}
              />
            </View>
          }
        />
        </View>
      </GestureHandlerRootView>
      
      {showFilters && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' }}>
          <RNAnimated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: overlayOpacity }} pointerEvents="none" />
          <TouchableOpacity activeOpacity={1} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onPress={closeFilters} />
          <RNAnimated.View
            style={{ transform: [{ translateY: sheetY }], width: '100%' }}
            pointerEvents="box-none"
          >
            <View
              style={{
                backgroundColor: c.card as string,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                width: '100%',
                maxHeight: '90%',
                elevation: 20,
                shadowColor: '#000000',
                shadowOpacity: 0.2,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: -2 },
                paddingBottom: 0,
              }}
              onStartShouldSetResponder={() => true}
            >
            <View {...sheetPan.panHandlers} style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
              <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 10 }}>
                <View style={{ width: 44, height: 6, borderRadius: 3, backgroundColor: active === 'dark' ? '#3A3A3C' : '#E5E5EA' }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: c.text as string }}>Filters</Text>
                {!isDefaultFilters && (
                  <Text style={{ fontSize: 12, color: c.muted as string }}>{activeFiltersCount} active</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {!isDefaultFilters && (
                  <TouchableOpacity
                    onPress={() => { setFilterMode('all'); setFilterResult('any'); setSortOrder('new'); setFavoritesOnly(false); }}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: active === 'dark' ? '#1C1C1E' : '#EFEFF4' }}
                  >
                    <Text style={{ color: c.text as string, fontSize: 12 }}>Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeFilters} style={{ padding: 6, borderRadius: 16 }}>
                  <Ionicons name="close" size={22} color={c.text as string} />
                </TouchableOpacity>
              </View>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: active === 'dark' ? '#3A3A3C' : '#E5E5EA' }} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            >
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.text as string }}>Game Mode</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                <TouchableOpacity onPress={() => setFilterMode('all')} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8, backgroundColor: filterMode === 'all' ? (c.primary as string) : (c.card as string), borderWidth: 1, borderColor: filterMode === 'all' ? (c.primary as string) : (active === 'dark' ? '#3A3A3C' : '#E5E5EA') }}>
                  <Text style={{ color: filterMode === 'all' ? '#FFFFFF' : (c.text as string) }}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilterMode('online')} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8, backgroundColor: filterMode === 'online' ? (c.primary as string) : (c.card as string), borderWidth: 1, borderColor: filterMode === 'online' ? (c.primary as string) : (active === 'dark' ? '#3A3A3C' : '#E5E5EA') }}>
                  <Text style={{ color: filterMode === 'online' ? '#FFFFFF' : (c.text as string) }}>Online</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilterMode('ai')} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8, backgroundColor: filterMode === 'ai' ? (c.primary as string) : (c.card as string), borderWidth: 1, borderColor: filterMode === 'ai' ? (c.primary as string) : (active === 'dark' ? '#3A3A3C' : '#E5E5EA') }}>
                  <Text style={{ color: filterMode === 'ai' ? '#FFFFFF' : (c.text as string) }}>vs AI</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilterMode('local')} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8, backgroundColor: filterMode === 'local' ? (c.primary as string) : (c.card as string), borderWidth: 1, borderColor: filterMode === 'local' ? (c.primary as string) : (active === 'dark' ? '#3A3A3C' : '#E5E5EA') }}>
                  <Text style={{ color: filterMode === 'local' ? '#FFFFFF' : (c.text as string) }}>Local</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Result */}
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.text as string }}>Result</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                <TouchableOpacity onPress={() => setFilterResult('any')} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8, backgroundColor: filterResult === 'any' ? (c.primary as string) : (c.card as string), borderWidth: 1, borderColor: filterResult === 'any' ? (c.primary as string) : (active === 'dark' ? '#3A3A3C' : '#E5E5EA') }}>
                  <Text style={{ color: filterResult === 'any' ? '#FFFFFF' : (c.text as string) }}>Any</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilterResult('1-0')} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8, backgroundColor: filterResult === '1-0' ? (c.primary as string) : (c.card as string), borderWidth: 1, borderColor: filterResult === '1-0' ? (c.primary as string) : (active === 'dark' ? '#3A3A3C' : '#E5E5EA') }}>
                  <Text style={{ color: filterResult === '1-0' ? '#FFFFFF' : (c.text as string) }}>Won</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilterResult('0-1')} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8, backgroundColor: filterResult === '0-1' ? (c.primary as string) : (c.card as string), borderWidth: 1, borderColor: filterResult === '0-1' ? (c.primary as string) : (active === 'dark' ? '#3A3A3C' : '#E5E5EA') }}>
                  <Text style={{ color: filterResult === '0-1' ? '#FFFFFF' : (c.text as string) }}>Lost</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilterResult('1/2-1/2')} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8, backgroundColor: filterResult === '1/2-1/2' ? (c.primary as string) : (c.card as string), borderWidth: 1, borderColor: filterResult === '1/2-1/2' ? (c.primary as string) : (active === 'dark' ? '#3A3A3C' : '#E5E5EA') }}>
                  <Text style={{ color: filterResult === '1/2-1/2' ? '#FFFFFF' : (c.text as string) }}>Draw</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sort */}
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.text as string }}>Sort</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                <TouchableOpacity onPress={() => setSortOrder('new')} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8, backgroundColor: sortOrder === 'new' ? (c.primary as string) : (c.card as string), borderWidth: 1, borderColor: sortOrder === 'new' ? (c.primary as string) : (active === 'dark' ? '#3A3A3C' : '#E5E5EA') }}>
                  <Text style={{ color: sortOrder === 'new' ? '#FFFFFF' : (c.text as string) }}>Newest</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSortOrder('old')} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8, marginBottom: 8, backgroundColor: sortOrder === 'old' ? (c.primary as string) : (c.card as string), borderWidth: 1, borderColor: sortOrder === 'old' ? (c.primary as string) : (active === 'dark' ? '#3A3A3C' : '#E5E5EA') }}>
                  <Text style={{ color: sortOrder === 'old' ? '#FFFFFF' : (c.text as string) }}>Oldest</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Favorites */}
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setFavoritesOnly(!favoritesOnly)} style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#0A84FF', alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: favoritesOnly ? '#0A84FF' : 'transparent' }}>
                {favoritesOnly && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </TouchableOpacity>
              <Text style={{ color: '#111111' }}>Favorites only</Text>
            </View>

            </ScrollView>
            <View style={{ height: 1, backgroundColor: active === 'dark' ? '#3A3A3C' : '#E5E5EA' }} />
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.card as string }}>
              <TouchableOpacity onPress={() => { try { fetchData(); } catch {} closeFilters(); }} style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: c.primary as string, borderRadius: 10 }}>
                <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>Apply</Text>
              </TouchableOpacity>
            </View>
            </View>
          </RNAnimated.View>
        </View>
      )}

      {snackbar && (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: Math.max(12, insets.bottom + 12) }}>
          <View style={{ backgroundColor: active === 'dark' ? '#222' : '#111', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#FFFFFF' }}>{snackbar.message}</Text>
            {snackbar.actionLabel && snackbar.onAction && (
              <TouchableOpacity onPress={() => { snackbar.onAction?.(); setSnackbar(null); }}>
                <Text style={{ color: '#60A5FA', fontWeight: '700' }}>{snackbar.actionLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {scrollLabel && (
        <View style={{ position: 'absolute', right: 12, top: 100, backgroundColor: active === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
          <Text style={{ color: c.text as string, fontWeight: '600' }}>{scrollLabel}</Text>
        </View>
      )}

      {sections.length > 10 && (
        <View pointerEvents="box-none" style={{ position: 'absolute', right: 6, top: 100, bottom: 140, width: 36 }}>
          <View
            {...pan.panHandlers}
            onLayout={onTrackLayout}
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 28, borderRadius: 14, backgroundColor: active === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}
          >
            {showScroller && (
              <View style={{ position: 'absolute', top: Math.max(6, Math.min((trackH || 1) - 18, thumbY - 9)), width: 16, height: 16, borderRadius: 8, backgroundColor: c.primary as string, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }} />
            )}
          </View>
        </View>
      )}

      {contextItem && (
        <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => { setContextItem(null); hideTabs(false); }} />
          <RNAnimated.View style={{ transform: [{ translateY: 0 }] }}>
            <View style={{ backgroundColor: c.card as string, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
              <Text style={{ color: c.text as string, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Game actions</Text>
              <View style={{ height: 1, backgroundColor: active === 'dark' ? '#3A3A3C' : '#E5E5EA' }} />
              <View style={{ paddingTop: 12, gap: 8 }}>
                <TouchableOpacity onPress={() => { setContextItem(null); hideTabs(false); handleFavorite(contextItem.id, contextItem.is_favorite); }} style={{ paddingVertical: 10 }}>
                  <Text style={{ color: c.text as string }}>{contextItem.is_favorite ? 'Unfavorite' : 'Favorite'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async ()=> { setContextItem(null); hideTabs(false); try { await Share.share({ message: contextItem.pgn || '' }); } catch {} }} style={{ paddingVertical: 10 }}>
                  <Text style={{ color: c.text as string }}>Share PGN</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setContextItem(null); hideTabs(false); router.push(`/archive/${contextItem.id}`); }} style={{ paddingVertical: 10 }}>
                  <Text style={{ color: c.text as string }}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setContextItem(null); hideTabs(false); handleDelete(contextItem.id); }} style={{ paddingVertical: 10 }}>
                  <Text style={{ color: '#e11d48' }}>Delete</Text>
                </TouchableOpacity>
              </View>
              <View style={{ paddingTop: 8 }}>
                <TouchableOpacity onPress={() => { setContextItem(null); hideTabs(false); }} style={{ alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Text style={{ color: c.muted as string }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </RNAnimated.View>
        </View>
      )}

      {zoom && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setZoom(null)} />
          <View style={{ backgroundColor: c.card as string, padding: 12, borderRadius: 16 }}>
            <BoardSkia fen={zoom.fen} onMove={()=>{}} enabled={false} size={Math.min(Dimensions.get('window').width - 40, 320)} lastFrom={zoom.from as any} lastTo={zoom.to as any} />
            {zoom.result && (
              <Text style={{ textAlign: 'center', color: zoom.result === '1-0' ? '#16a34a' : zoom.result === '0-1' ? '#ef4444' : (c.text as string), marginTop: 8, fontWeight: '700' }}>{zoom.result}</Text>
            )}
          </View>
        </View>
      )}
    </>
  );
}