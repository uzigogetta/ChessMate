import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import {
  useWindowDimensions,
  ScrollView,
  Pressable,
  StyleSheet,
  View,
  Animated,
  Easing,
  useColorScheme,
  Modal,
} from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { BoardStatusBanner } from '@/features/chess/components/board/BoardStatusBanner';
import type { BoardStatus } from '@/features/chess/components/board/BoardCore';
import { START_FEN, applyMove, fenToBoard, sideToMove, applySANs } from '@/features/chess/logic/chess.rules';
import { MockEngine } from '@/features/chess/engine/engine.mock';
import type { EngineInitOptions, SearchCapableEngine } from '@/features/chess/engine/engine.types';
import { configureEngineWithSettings } from '@/features/chess/engine/EngineManager';
import { detectTerminal } from '@/game/terminal';
import { buildPGN } from '@/archive/pgn';
import { insertGame } from '@/archive/db';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { themes, ThemeName } from '@/ui/tokens';
import { getTheme } from '@/ui/tokens';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useReview } from '@/features/view/review.store';
import { BottomBar } from '@/features/game/BottomBar';
import { toast } from '@/ui/toast';
import { ThemeName as TN2 } from '@/ui/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SND } from '../../assets/snd';
import { AnimRegistryProvider } from '@/features/chess/animation/AnimRegistry';
import { useMoveResolver } from '@/features/chess/animation/MoveResolver';
import { CommentaryStrip, createCommentarySession, resolvePersona, useCommentarySettings } from '@/features/commentary';
import { useEngineSettings } from '@/features/chess/engine/engineSettings.store';
import type { EngineMode } from '@/features/chess/engine/engineSettings.store';

const styles = StyleSheet.create({
  badgeWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  badgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(16,16,22,0.9)',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    columnGap: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeLabel: {
    color: '#f9fafb',
    fontWeight: '700',
    fontSize: 12,
  },
  badgeChevron: {
    marginLeft: 4,
  },
  modalRoot: {
    flex: 1,
  },
  popoverBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,10,14,0.35)',
  },
  popoverAnchor: {
    position: 'absolute',
    minWidth: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(17,17,23,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 1,
  },
  popoverBlur: StyleSheet.absoluteFillObject,
  popoverContent: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  popoverTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#cbd5f5',
  },
  popoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  popoverRowActive: {
    backgroundColor: 'rgba(124,58,237,0.22)',
  },
  popoverRowLabel: {
    fontSize: 12,
    color: '#d1d5db',
    fontWeight: '500',
  },
  popoverRowLabelActive: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  popoverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(148,163,184,0.45)',
  },
  popoverCaret: {
    position: 'absolute',
    width: 14,
    height: 14,
    top: -7,
    transform: [{ rotate: '45deg' }],
    backgroundColor: 'rgba(17,17,23,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});

const DEFAULT_PERSONA = resolvePersona(undefined);

type EngineDisplayMode = EngineMode | 'fallback';

const ENGINE_LABELS: Record<EngineDisplayMode, string> = {
  auto: 'Auto Engine',
  native: 'Native Engine',
  browser: 'Browser Engine',
  fallback: 'Fallback Engine',
};

const ENGINE_OPTIONS: Array<{ key: EngineDisplayMode; label: string }> = [
  { key: 'auto', label: ENGINE_LABELS.auto },
  { key: 'native', label: ENGINE_LABELS.native },
  { key: 'browser', label: ENGINE_LABELS.browser },
  { key: 'fallback', label: ENGINE_LABELS.fallback },
];

const EngineBadge = React.memo(function EngineBadge({
  color,
  label,
  expanded,
  onToggle,
  options,
  activeMode,
}: {
  color: string;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  options: Array<{ key: EngineDisplayMode; label: string }>;
  activeMode: EngineDisplayMode;
}) {
  const animation = React.useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const [anchorRect, setAnchorRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const triggerRef = useRef<View>(null);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: expanded ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    if (expanded) {
      requestAnimationFrame(() => {
        triggerRef.current?.measure((x, y, width, height, pageX, pageY) => {
          const measuredX = (pageX ?? x) ?? 0;
          const measuredY = (pageY ?? y) ?? 0;
          setAnchorRect({ x: measuredX, y: measuredY, width: width ?? 0, height: height ?? 0 });
        });
      });
    }
  }, [animation, expanded]);

  const scale = animation.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const opacity = animation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={styles.badgeWrapper}>
      <Pressable
        ref={triggerRef}
        onPress={onToggle}
        style={[styles.badgeButton, { borderColor: color }]}
        accessibilityRole="button"
        accessibilityLabel="Engine status"
        accessibilityHint="Tap to view engine configuration"
      >
        <View style={styles.badgeContent}>
          <View style={[styles.badgeDot, { backgroundColor: color }]} />
          <Text style={styles.badgeLabel}>{label}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#f9fafb"
            style={styles.badgeChevron}
          />
        </View>
      </Pressable>
      <Modal transparent visible={expanded} animationType="fade" onRequestClose={onToggle}>
        <Pressable style={styles.modalRoot} onPress={onToggle}>
          <Animated.View
            style={[
              styles.popoverAnchor,
              anchorRect
                ? {
                    top: Math.max(60, anchorRect.y + anchorRect.height + 6),
                    left: Math.max(12, anchorRect.x + anchorRect.width - 240),
                  }
                : { top: 76, right: 16 },
              { transform: [{ scale }], opacity },
            ]}
          >
            <BlurView intensity={40} tint="dark" style={styles.popoverBlur} />
            <View style={styles.popoverContent}>
              <Text style={styles.popoverTitle}>Engine Modes</Text>
              {options.map((option) => (
                <View
                  key={option.key}
                  style={[styles.popoverRow, option.key === activeMode && styles.popoverRowActive]}
                  pointerEvents="none"
                >
                  <Text style={[styles.popoverRowLabel, option.key === activeMode && styles.popoverRowLabelActive]}>
                    {option.label}
                  </Text>
                  <View style={[styles.popoverDot, option.key === activeMode && { backgroundColor: color }]} />
                </View>
              ))}
            </View>
            <View style={[styles.popoverCaret, { right: 24 }]} />
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
});

export default function AIGameScreen() {
  const [fen, setFen] = useState(START_FEN);
  const [history, setHistory] = useState<string[]>([]);
  const [mySide, setMySide] = useState<'white' | 'black'>('white');
  const [thinking, setThinking] = useState(false);
  const params = useLocalSearchParams();
  const levelParam = Number(params.level || 4);
  const level = (Number.isFinite(levelParam) && levelParam >=1 && levelParam <=12 ? (levelParam as any) : 4);
  const commentarySettings = useCommentarySettings();
  const { coach, persona } = params as { coach?: string; persona?: string };
  const personaId = persona ?? commentarySettings.persona ?? DEFAULT_PERSONA.id;
  const personaPreset = resolvePersona(personaId ?? DEFAULT_PERSONA.id);
  const coachEnabledParam = coach === '1' ? true : coach === '0' ? false : commentarySettings.enabled;
  const [coachEnabled, setCoachEnabled] = useState(coachEnabledParam);
  const engineSettings = useEngineSettings();
  const [engine, setEngineInstance] = useState<SearchCapableEngine | MockEngine | null>(null);
  const [engineStatus, setEngineStatus] = useState<'init'|'ready'|'fallback'|'error'>('init');
  const [activeEngineMode, setActiveEngineMode] = useState<EngineDisplayMode>(engineSettings.mode);
  const [engineExpanded, setEngineExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    setEngineStatus('init');
    (async () => {
      try {
        const { engine: instance, mode } = await configureEngineWithSettings();
        if (!mounted) return;
        setEngineInstance(instance);
        setActiveEngineMode(mode === 'mock' ? 'fallback' : (mode as EngineDisplayMode));
        setEngineStatus('ready');
      } catch (error) {
        if (!mounted) return;
        console.warn('[AI] failed to load engine, using mock', error);
        const mock = new MockEngine();
        await mock.init();
        setEngineInstance(mock);
        setActiveEngineMode('fallback');
        setEngineStatus('fallback');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!engine || typeof engine.bestMove !== 'function') {
      if ((window as any).__engineTest) delete (window as any).__engineTest;
      return;
    }

    const helper = async (depth: number = 8) => {
      const clampedDepth = Math.max(1, Math.min(20, Math.floor(depth)));
      const budgetMs = 800 + clampedDepth * 120;
      const start = Date.now();
      console.log(`[engineTest] bestmove sanity (depth ${clampedDepth})`);
      try {
        const move = await engine.bestMove(START_FEN, budgetMs);
        const elapsedMs = Date.now() - start;
        console.log(`[engineTest] ok in ${elapsedMs}ms → ${move.san ?? `${move.from}${move.to}`}`);
        return { ok: true, elapsedMs, move } as const;
      } catch (error) {
        console.error('[engineTest] failed', error);
        return { ok: false, error } as const;
      }
    };

    (window as any).__engineTest = helper;
    console.log('[engineTest] helper registered on window.__engineTest(depth)');

    return () => {
      if ((window as any).__engineTest === helper) delete (window as any).__engineTest;
    };
  }, [engine]);

  useEffect(() => {
    // Apply persona skill bias without full re-init
    if (!engine) return;
    const preset = resolvePersona(persona);
    const skill = Math.max(1, Math.min(12, preset.engine.skill ?? level));
    const options: EngineInitOptions = {
      skill: Math.round((skill / 12) * 20),
    };
    engine.init(options).catch((error: unknown) => {
      console.warn('[AI] skill update failed', error);
    });
  }, [engine, persona, level]);
  const turn = useMemo(() => fenToBoard(fen).turn, [fen]);
  const { width } = useWindowDimensions();
  const fullEdge = useSettings((s) => s.fullEdgeBoard);
  const insets = useSafeAreaInsets();
  const containerPad = fullEdge ? 0 : 12;
  const boardSize = Math.floor(width - (fullEdge ? 0 : 24));
  const lastHumanMove = useRef<{ from: string; to: string } | null>(null);
  const [lastFromSq, setLastFromSq] = useState<string | null>(null);
  const [lastToSq, setLastToSq] = useState<string | null>(null);
  const [lastWasCapture, setLastWasCapture] = useState<boolean>(false);
  const [boardStatus, setBoardStatus] = useState<BoardStatus | null>(null);
  const [orientation, setOrientation] = useState<'w'|'b'>('w');
  const router = useRouter();
  const sys = useColorScheme();
  const settingsVals = useSettings();
  const modeName: ThemeName = (settingsVals.theme === 'system' ? (sys === 'dark' ? 'dark' : 'light') : settingsVals.theme) as ThemeName;
  const BAR_HEIGHT = 64;
  const bottomPad = Math.max(insets.bottom, 12) + BAR_HEIGHT + 16;
  const { play, invalid } = useMoveResolver();
  const commentarySessionRef = useRef(
    createCommentarySession({
      mode: 'ai',
      playerName: 'You',
      opponentName: 'Stockfish',
      aiLevel: level,
      coachEnabled,
      personaId: personaPreset.id,
      detail: commentarySettings.detail,
    }),
  );
  const [commentaryRoomId, setCommentaryRoomId] = useState(commentarySessionRef.current.getRoomId());
  const historyRef = useRef<string[]>(history);
  const fenRef = useRef<string>(fen);

  const personaCard = useMemo(() => ({
    name: personaPreset.name,
    title: personaPreset.title,
    fallback: personaPreset.fallback,
    gradient: personaPreset.gradient,
  }), [personaPreset]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  useEffect(() => {
    commentarySessionRef.current.setCoach(coachEnabled, personaPreset.id, commentarySettings.detail);
    commentarySessionRef.current.updateMeta({
      playerName: mySide === 'white' ? 'You (White)' : 'You (Black)',
      opponentName: mySide === 'white' ? 'Stockfish (Black)' : 'Stockfish (White)',
      aiLevel: level,
      personaId: personaPreset.id,
      detail: commentarySettings.detail,
    });
    setCommentaryRoomId(commentarySessionRef.current.getRoomId());
  }, [mySide, level, coachEnabled, personaPreset.id, commentarySettings.detail]);

  useEffect(() => {
    commentarySessionRef.current.updateMeta({
      playerName: orientation === 'w' ? 'You (White)' : 'You (Black)',
      opponentName: orientation === 'w' ? 'Stockfish (Black)' : 'Stockfish (White)',
    });
    setCommentaryRoomId(commentarySessionRef.current.getRoomId());
  }, [orientation]);

  const emitCommentary = useCallback((prevFen: string, nextFen: string, san: string, historySAN: string[]) => {
    if (!commentarySessionRef.current.isCoachEnabled()) return;
    const moverColor = fenToBoard(prevFen).turn;
    const moverRole = moverColor === (mySide === 'white' ? 'w' : 'b') ? 'player' : 'ai';
    commentarySessionRef.current.emitMove({
      prevFen,
      nextFen,
      moveSan: san,
      mover: moverRole,
      color: moverColor,
      historySAN,
    });
  }, [mySide]);
  const squareToPixel = React.useCallback((sq: string) => {
    const file = sq[0];
    const rank = sq[1];
    const col = ('abcdefgh').indexOf(file); // canonical mapping
    const row = 8 - parseInt(rank, 10);
    const rr = orientation === 'w' ? row : 7 - row;
    const cc = orientation === 'w' ? col : 7 - col;
    const cell = boardSize / 8;
    return { x: cc * cell + cell * 0.05, y: rr * cell + cell * 0.05 };
  }, [orientation, boardSize]);

  const handleBoardStatus = React.useCallback((next: BoardStatus | null) => {
    setBoardStatus((prev) => {
      if (prev?.key === next?.key) return prev;
      return next ?? null;
    });
  }, []);

  // Play game start sound only when arriving on a fresh board
  useEffect(() => {
    (async () => {
      try {
        if (!useSettings.getState().sounds) return;
        if (fen !== START_FEN || history.length !== 0) return;
        if (!(SND as any).game_start) return;
        const AudioModule = await import('expo-audio');
        const player = AudioModule.createAudioPlayer((SND as any).game_start);
        player?.play?.();
      } catch {}
    })();
    // run only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <AnimRegistryProvider>
    <Screen style={{ paddingTop: 0, paddingHorizontal: containerPad }}>
      <Stack.Screen options={{ headerTitle: 'AI Game', headerRight: () => {
        const color = engineStatus === 'ready' ? '#16a34a' : engineStatus === 'fallback' ? '#64748b' : engineStatus === 'error' ? '#ef4444' : '#f59e0b';
        const label = engineStatus === 'ready'
          ? ENGINE_LABELS[activeEngineMode]
          : engineStatus === 'fallback'
          ? ENGINE_LABELS.fallback
          : engineStatus === 'error'
          ? 'Error'
          : 'Initialising…';
        return (
          <EngineBadge
            color={color}
            label={label}
            expanded={engineExpanded}
            onToggle={() => setEngineExpanded((prev) => !prev)}
            options={ENGINE_OPTIONS}
            activeMode={activeEngineMode}
          />
        );
      } }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, alignItems: 'center', justifyContent: 'flex-start', gap: 12, paddingBottom: bottomPad }}>
        <Card>
          <Text>
            {`AI — Turn: ${turn === 'w' ? 'White' : 'Black'} ${thinking ? '(thinking…)' : ''}`}
          </Text>
        </Card>
        <BoardStatusBanner status={boardStatus} style={{ paddingHorizontal: fullEdge ? 0 : 12 }} />
        {coachEnabled ? (
          <CommentaryStrip
            roomId={commentaryRoomId}
            persona={personaCard}
            evaluation={thinking ? 'Thinking…' : undefined}
            style={{ width: boardSize, alignSelf: 'center' }}
          />
        ) : null}
        <BoardSkia
          onStatusChange={handleBoardStatus}
          fen={fen}
          size={boardSize}
          moveIndex={history.length}
          lastFrom={lastFromSq as any}
          lastTo={lastToSq as any}
          lastWasCapture={lastWasCapture}
          orientation={orientation}
          onMoveWithPromotion={(from, to, promo) => {
            if (thinking) return;
            // Apply with promotion: build SAN by trying move with promotion letter
            const r = applyMove(fen, { from, to, promotion: promo as any });
            if (!r.ok) { invalid(`${from}`); return; }
            const pre = fenToBoard(fen).chess;
            const mover = pre.get(from as any);
            const victim = pre.get(to as any);
            const moverCode = mover ? `${mover.color}${String(mover.type).toUpperCase()}` : 'wP';
            const moverId = `${moverCode}@${from}`;
            const captureId = victim ? `${victim.color}${String(victim.type).toUpperCase()}@${to}` : undefined;
            const toPixel = squareToPixel(to);
            lastHumanMove.current = { from, to };
            play({
              moverId,
              toPixel,
              captureId,
              onApplyMove: () => {
                setFen(r.fen);
                setHistory((h) => {
                  const updated = [...h, r.san];
                  emitCommentary(fenRef.current, r.fen, r.san, updated);
                  const t = detectTerminal('', updated);
                  if (t.over) { saveAiArchive(updated, t.result as any); }
                  return updated;
                });
                setLastFromSq(from);
                setLastToSq(to);
                setLastWasCapture(r.san.includes('x'));
              },
            });
          }}
          onMove={(from, to) => {
            if (thinking) return;
            const r = applyMove(fen, { from, to });
            if (!r.ok) { invalid(`${from}`); return; }
            const pre = fenToBoard(fen).chess;
            const mover = pre.get(from as any);
            const victim = pre.get(to as any);
            const moverCode = mover ? `${mover.color}${String(mover.type).toUpperCase()}` : 'wP';
            const moverId = `${moverCode}@${from}`;
            const captureId = victim ? `${victim.color}${String(victim.type).toUpperCase()}@${to}` : undefined;
            const toPixel = squareToPixel(to);
            lastHumanMove.current = { from, to };
            play({
              moverId,
              toPixel,
              captureId,
              onApplyMove: () => {
                setFen(r.fen);
                setHistory((h) => {
                  const updated = [...h, r.san];
                  emitCommentary(fenRef.current, r.fen, r.san, updated);
                  const t = detectTerminal('', updated);
                  if (t.over) { saveAiArchive(updated, t.result as any); }
                  return updated;
                });
                setLastFromSq(from);
                setLastToSq(to);
                setLastWasCapture(r.san.includes('x'));
              },
            });
          }}
        />
        <Button title="Swap Sides" onPress={() => {
          setMySide((s) => (s === 'white' ? 'black' : 'white'));
          setFen((f) => f);
        }} />
        <Button title="Undo" onPress={async () => {
          const cut = history.length >= 2 ? history.length - 2 : 0;
          const next = history.slice(0, cut);
          const newFen = await applySANs(next);
          setHistory(next);
          historyRef.current = next;
          setFen(newFen);
          fenRef.current = newFen;
          commentarySessionRef.current.reset(next, newFen);
          setCommentaryRoomId(commentarySessionRef.current.getRoomId());
        }} />
        <Button title="Reset" onPress={() => {
          setHistory([]);
          historyRef.current = [];
          setFen(START_FEN);
          fenRef.current = START_FEN;
          setLastFromSq(null);
          setLastToSq(null);
          setLastWasCapture(false);
          commentarySessionRef.current.reset([], START_FEN);
          setCommentaryRoomId(commentarySessionRef.current.getRoomId());
        }} />
        <Button title="Resign" onPress={async () => {
          const youAre = mySide === 'white' ? 'w' : 'b';
          const result = youAre === 'w' ? '0-1' : '1-0';
          await saveAiArchive(history, result as any);
        }} />
        <AIGameEffects
          fen={fen}
          mySide={mySide}
          engine={engine}
          setThinking={setThinking}
          setFen={setFen}
          setHistory={setHistory}
          thinking={thinking}
          lastHumanMoveRef={lastHumanMove}
          play={play}
          squareToPixel={squareToPixel}
          setLastFrom={setLastFromSq}
          setLastTo={setLastToSq}
          setLastWasCapture={setLastWasCapture}
          level={level}
          emitCommentary={emitCommentary}
        />
      </ScrollView>

      <BottomBar
        room={undefined}
        mySide={mySide === 'white' ? 'w' : 'b'}
        onUndo={async () => {
          const cut = history.length >= 2 ? history.length - 2 : 0; const next = history.slice(0, cut); const newFen = await applySANs(next); setHistory(next); setFen(newFen);
        }}
        onOfferDraw={() => toast('Offer draw not available in AI mode')}
        onResign={async () => { const youAre = mySide === 'white' ? 'w' : 'b'; const result = youAre === 'w' ? '0-1' : '1-0'; await saveAiArchive(history, result as any); }}
        onGoLive={() => {}}
        bottomInset={insets.bottom}
        iconColor={themes[modeName].text as string}
        mode={modeName}
        onFlip={() => setOrientation((o)=> o==='w'?'b':'w')}
        soundsEnabled={settingsVals.sounds}
        toggleSounds={() => settingsVals.setSounds(!settingsVals.sounds)}
        hapticsEnabled={settingsVals.haptics}
        toggleHaptics={() => settingsVals.setHaptics(!settingsVals.haptics)}
        boardTheme={settingsVals.boardTheme}
        onSelectBoardTheme={(t)=> settingsVals.setBoardTheme(t)}
        onOpenSettings={() => router.push('/(tabs)/profile/settings')}
        coach={{
          available: true,
          enabled: coachEnabled,
          onToggle: (value) => {
            setCoachEnabled(value);
            commentarySettings.setEnabled(value);
            commentarySessionRef.current.setCoach(value, personaPreset.id, commentarySettings.detail);
          },
        }}
      />
    </Screen>
    </AnimRegistryProvider>
  );
}

// Trigger AI when it's AI's turn
export function AIGameEffects({ fen, mySide, engine, setThinking, setFen, setHistory, thinking, lastHumanMoveRef, play, squareToPixel, setLastFrom, setLastTo, setLastWasCapture, level, emitCommentary }: any) {
  useEffect(() => {
    const turn = sideToMove(fen);
    const aiIs = mySide === 'white' ? 'b' : 'w';
    if (turn !== aiIs) return;

    const delayByLevel = [120, 180, 220, 280, 360, 420, 520, 650];
    const postMoveDelay = [80, 100, 120, 140, 160, 180, 200, 240];
    const idx = Math.max(1, Math.min(8, level || 4)) - 1;
    const preDelay = delayByLevel[idx];
    const postDelay = postMoveDelay[idx];
    setThinking(true);

    const tm = setTimeout(() => {
      const last = lastHumanMoveRef?.current;
      const exclude = last ? [`${last.to}${last.from}`] : [];
      engine
        .bestMove(fen, 300 + idx * 60, exclude)
        .then((m: any) => {
          if (!m || !m.from || !m.to) {
            setThinking(false);
            return;
          }
          const sanPromotion = typeof m.san === 'string' && m.san.includes('=') ? m.san.split('=')[1]?.charAt(0)?.toLowerCase() : undefined;
          const promotion = (m.promotion || sanPromotion) as ('q' | 'r' | 'b' | 'n' | undefined);
          const moveInput: any = { from: m.from, to: m.to };
          if (promotion) moveInput.promotion = promotion;

          setTimeout(() => {
            const result = applyMove(fen, moveInput);
            if (!result.ok) {
              setThinking(false);
              return;
            }
            const pre = fenToBoard(fen).chess;
            const mover = pre.get(m.from as any);
            const victim = pre.get(m.to as any);
            const moverCode = mover ? `${mover.color}${String(mover.type).toUpperCase()}` : 'wP';
            const moverId = `${moverCode}@${m.from}`;
            const captureId = victim ? `${victim.color}${String(victim.type).toUpperCase()}@${m.to}` : undefined;
            const toPixel = squareToPixel(m.to);

            play({
              moverId,
              toPixel,
              captureId,
              onApplyMove: () => {
                setThinking(false);
                setFen(result.fen);
                setHistory((h: string[]) => {
                  const updated = [...h, result.san];
                  emitCommentary?.(fen, result.fen, result.san, updated);
                  const t = detectTerminal('', updated);
                  if (t.over) { saveAiArchive(updated, t.result as any); }
                  return updated;
                });
                setLastFrom(m.from);
                setLastTo(m.to);
                setLastWasCapture(result.san.includes('x'));
                if (lastHumanMoveRef) lastHumanMoveRef.current = null;
              },
            });
          }, postDelay);
        })
        .catch(() => {
          setThinking(false);
        });
    }, preDelay + Math.floor(Math.random() * 120));

    return () => clearTimeout(tm);
  }, [fen, mySide, engine, setFen, setHistory, setThinking, play, squareToPixel, setLastFrom, setLastTo, setLastWasCapture, level, lastHumanMoveRef]);
  return null;
}
async function saveAiArchive(historySAN: string[], result: '1-0'|'0-1'|'1/2-1/2') {
  try {
    const pgn = buildPGN({ result, movesSAN: historySAN, event: 'ChessMate AI' as any });
    const row: any = {
      id: `ai_${Date.now()}`,
      createdAt: Date.now(),
      mode: 'ai',
      result,
      pgn,
      moves: historySAN.length,
      durationMs: 0,
      whiteName: 'You',
      blackName: 'Stockfish',
    };
    await insertGame(row);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[AI] archive save failed', e);
  }
}

