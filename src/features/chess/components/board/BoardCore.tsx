import React, { useMemo, useState, useCallback } from 'react';
import { View, Animated as RNAnimated, Platform, Pressable, Image as RNImage } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SND } from '../../../../../assets/snd';
import { BlurView } from 'expo-blur';
import { Canvas, Rect, Group, Circle, Text as SkiaText, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { themes as uiThemes } from '@/ui/tokens';
import { useSettings } from '@/features/settings/settings.store';
import { useColorScheme } from 'react-native';
import { useBoardTheme } from '@/ui/useBoardTheme';
import { fenToBoard, legalMovesFrom } from '@/features/chess/logic/chess.rules';
import { usePieceFont } from '@/ui/fonts';
import { resolvePiece } from '@/chess/pieces.loader';
import { AnimatedPiece } from '../AnimatedPiece';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useAnimRegistry } from '../../animation/AnimRegistry';

export type BannerTone = 'critical' | 'success' | 'info' | 'warning' | 'neutral';
export type BoardStatusKind = 'checkmate' | 'stalemate' | 'material' | 'threefold' | 'draw' | 'check';
export type BoardStatus = { key: string; kind: BoardStatusKind; title: string; subtitle?: string; tone: BannerTone };
export const BOARD_STATUS_COLORS: Record<BannerTone, string> = {
  success: 'rgba(48, 209, 88, 0.92)',
  warning: 'rgba(255, 159, 10, 0.92)',
  info: 'rgba(10, 132, 255, 0.92)',
  critical: 'rgba(255, 69, 58, 0.92)',
  neutral: 'rgba(142, 142, 147, 0.92)',
};

type Props = {
  fen: string;
  onMove: (from: string, to: string) => void;
  onMoveWithPromotion?: (from: string, to: string, promotion: 'q'|'r'|'b'|'n') => void;
  onOptimisticMove?: (from: string, to: string, rollback: () => void) => void;
  coords?: boolean;
  orientation?: 'w' | 'b';
  enabled?: boolean;
  selectableColor?: 'w' | 'b';
  flashSquare?: string | null;
  size?: number;
  lastFrom?: string | null;
  lastTo?: string | null;
  lastWasCapture?: boolean;
  moveIndex?: number; // history length to key animations
};

const BOARD_SIZE = 320;

export default function BoardCore({ fen, onMove, onMoveWithPromotion, onOptimisticMove, orientation = 'w', enabled = true, selectableColor, flashSquare, size: sizeProp, lastFrom, lastTo, lastWasCapture, moveIndex, onStatusChange }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<{ from: string; to: string } | null>(null);
  const [invalidSq, setInvalidSq] = useState<string | null>(null);
  const { chess } = fenToBoard(fen);
  const board = chess.board();

  const boardTheme = useBoardTheme();
  const light = boardTheme.light;
  const dark = boardTheme.dark;
  const sys = useColorScheme();
  const app = useSettings((s) => s.theme);
  const pieceSet = useSettings((s) => s.pieceSet);
  const mode = app === 'system' ? (sys === 'dark' ? 'dark' : 'light') : app;
  const highlight = (uiThemes as any)[mode]?.accent ?? '#00E0B8';
  const registry = useAnimRegistry();

  const size = sizeProp ?? 320;
  const cell = size / 8;
  const font = usePieceFont(cell * 0.55);

  // Preload images deterministically (fixed hook order)
  const setName = (pieceSet === 'native' ? 'native' : 'default') as any;
  const a_wK = resolvePiece(setName, mode as any, 'wK' as any);
  const a_wQ = resolvePiece(setName, mode as any, 'wQ' as any);
  const a_wR = resolvePiece(setName, mode as any, 'wR' as any);
  const a_wB = resolvePiece(setName, mode as any, 'wB' as any);
  const a_wN = resolvePiece(setName, mode as any, 'wN' as any);
  const a_wP = resolvePiece(setName, mode as any, 'wP' as any);
  const a_bK = resolvePiece(setName, mode as any, 'bK' as any);
  const a_bQ = resolvePiece(setName, mode as any, 'bQ' as any);
  const a_bR = resolvePiece(setName, mode as any, 'bR' as any);
  const a_bB = resolvePiece(setName, mode as any, 'bB' as any);
  const a_bN = resolvePiece(setName, mode as any, 'bN' as any);
  const a_bP = resolvePiece(setName, mode as any, 'bP' as any);

  const i_wK = useImage(a_wK);
  const i_wQ = useImage(a_wQ);
  const i_wR = useImage(a_wR);
  const i_wB = useImage(a_wB);
  const i_wN = useImage(a_wN);
  const i_wP = useImage(a_wP);
  const i_bK = useImage(a_bK);
  const i_bQ = useImage(a_bQ);
  const i_bR = useImage(a_bR);
  const i_bB = useImage(a_bB);
  const i_bN = useImage(a_bN);
  const i_bP = useImage(a_bP);

  const imgMap: any = { wK: i_wK, wQ: i_wQ, wR: i_wR, wB: i_wB, wN: i_wN, wP: i_wP, bK: i_bK, bQ: i_bQ, bR: i_bR, bB: i_bB, bN: i_bN, bP: i_bP };

  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(legalMovesFrom(fen, selected).map((m) => m.to));
  }, [fen, selected]);

  const toSquare = useCallback(
    (row: number, col: number) => {
      const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
      const ranks = orientation === 'w' ? '87654321' : '12345678';
      return `${files[col]}${ranks[row]}`;
    },
    [orientation]
  );

  React.useEffect(() => {
    if (flashSquare) {
      setInvalidSq(flashSquare);
      const t = setTimeout(() => setInvalidSq(null), 220);
      return () => clearTimeout(t);
    }
  }, [flashSquare]);

  const squareToRowCol = useCallback(
    (sq: string) => {
      const file = sq[0];
      const rank = sq[1];
      const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
      const ranks = orientation === 'w' ? '87654321' : '12345678';
      const col = files.indexOf(file);
      const row = ranks.indexOf(rank);
      return { row, col };
    },
    [orientation]
  );

  const handleTap = useCallback(
    (sq: string) => {
      if (selected) {
        if (sq === selected) {
          setSelected(null);
          return;
        }
        if (legalTargets.has(sq)) {
          const from = selected;
          const to = sq;
          setSelected(null);
          onMove(from, to);
          return;
        }
      }
      const piece = chess.get(sq as any);
      if (piece && (!selectableColor || piece.color === selectableColor)) setSelected(sq);
      else {
        setSelected(null);
        if (piece && selectableColor && piece.color !== selectableColor) {
          setInvalidSq(sq);
          setTimeout(() => setInvalidSq(null), 220);
        }
      }
    },
    [chess, legalTargets, onMove, selected, selectableColor]
  );

  // Track unique move key to drive animations/sounds exactly once per move
  const lastMoveKeyRef = React.useRef<string | null>(null);
  const lastIndexRef = React.useRef<number | null>(null);
  const [activeMove, setActiveMove] = React.useState<{ from: string; to: string } | null>(null);
  React.useEffect(() => {
    if (typeof moveIndex === 'number') {
      if (lastFrom && lastTo && moveIndex !== lastIndexRef.current) {
        lastIndexRef.current = moveIndex;
        const key = `${lastFrom}-${lastTo}`;
        lastMoveKeyRef.current = key;
        setActiveMove({ from: lastFrom, to: lastTo });
      }
      return;
    }
    // Fallback: dedupe by key if moveIndex isn't provided
    if (!lastFrom || !lastTo) return;
    const key = `${lastFrom}-${lastTo}`;
    if (key !== lastMoveKeyRef.current) {
      lastMoveKeyRef.current = key;
      setActiveMove({ from: lastFrom, to: lastTo });
    }
  }, [lastFrom, lastTo, moveIndex]);

  // Move ripple animation only when the move key changes
  const pulse = React.useRef(new RNAnimated.Value(0)).current;
  React.useEffect(() => {
    if (!activeMove) return;
    pulse.setValue(0);
    RNAnimated.sequence([
      RNAnimated.timing(pulse, { toValue: 1, duration: 220, useNativeDriver: true }),
      RNAnimated.timing(pulse, { toValue: 0, duration: 220, useNativeDriver: true })
    ]).start();
  }, [activeMove?.from, activeMove?.to]);
  const rippleScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.08] });
  const rippleOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.0, 0.5] });

  // Skia values for move animation (feature-detected)
  React.useEffect(() => {
    if (!activeMove) return;
    const tid = setTimeout(() => setActiveMove(null), 240);
    return () => clearTimeout(tid);
  }, [activeMove?.from, activeMove?.to]);

  // Drag state
  const [drag, setDrag] = React.useState<{ from: string; id: string; x: number; y: number; code: string } | null>(null);
  const dragRef = React.useRef<typeof drag>(null);
  React.useEffect(() => { dragRef.current = drag; }, [drag]);

  const startDrag = useCallback((square: string) => {
    const piece = chess.get(square as any);
    if (!piece) return;
    const code = `${piece.color}${String(piece.type).toUpperCase()}`;
    const id = `${code}@${square}`;
    try { registry.get(id)?.dragStart(); } catch {}
    setDrag({ from: square, id, x: 0, y: 0, code });
  }, [chess, registry]);
  const updateDrag = useCallback((x: number, y: number) => {
    const clampedX = Math.max(0, Math.min(size, x));
    const clampedY = Math.max(0, Math.min(size, y));
    setDrag((d) => (d ? { ...d, x: clampedX, y: clampedY } : d));
  }, [size]);
  const stopDrag = useCallback(() => {
    setDrag((d) => {
      if (!d) return null;
      try { registry.get(d.id)?.dragEnd(); } catch {}
      return null;
    });
  }, [registry]);

  React.useEffect(() => { stopDrag(); }, [fen, stopDrag]);


  // Promotion overlay
  const [promotion, setPromotion] = React.useState<null | { from: string; to: string; color: 'w'|'b' }>(null);
  // Sounds + haptics
  const soundsEnabled = useSettings((s) => s.sounds);
  const moveSound = React.useRef<any>(null);
  const captureSound = React.useRef<any>(null);
  const checkSound = React.useRef<any>(null);
  const devLog = (...args: any[]) => { if (__DEV__) { try { console.log('[audio]', ...args); } catch {} } };
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!soundsEnabled || !(SND.move || SND.capture || SND.check)) return;
        let AudioModule: any = null;
        try { AudioModule = await import('expo-audio'); } catch { return; }
        try { await AudioModule.setAudioModeAsync?.({ playsInSilentModeIOS: true, allowsRecordingIOS: false }); } catch {}
        if (SND.move) { try { const mv = AudioModule.createAudioPlayer(SND.move); if (mv && mounted) moveSound.current = mv; } catch {} }
        if (SND.capture) { try { const cap = AudioModule.createAudioPlayer(SND.capture); if (cap && mounted) captureSound.current = cap; } catch {} }
        if (SND.check) { try { const chk = AudioModule.createAudioPlayer(SND.check); if (chk && mounted) checkSound.current = chk; } catch {} }
      } catch {}
    })();
    return () => { mounted = false; try { moveSound.current?.remove?.(); captureSound.current?.remove?.(); checkSound.current?.remove?.(); } catch {} };
  }, []);

  const playMoveFx = (wasCapture: boolean, wasCheck: boolean) => {
    try { if (useSettings.getState().haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    try {
      if (!soundsEnabled) { return; }
      const safePlay = async (player: any) => {
        try { if (!player) return; if (player.replay) await player.replay(); else if (player.seekTo && player.play) { await player.seekTo(0); await player.play(); } else if (player.play) await player.play(); } catch {}
      };
      if (wasCheck && checkSound.current) safePlay(checkSound.current);
      else if (wasCapture && captureSound.current) safePlay(captureSound.current);
      else if (moveSound.current) safePlay(moveSound.current);
    } catch {}
  };

  React.useEffect(() => {
    if (!activeMove) return;
    const isCheck = (chess as any).isCheck?.() || (chess as any).in_check?.();
    playMoveFx(!!lastWasCapture, !!isCheck);
  }, [activeMove?.from, activeMove?.to, lastWasCapture]);

  const isPromotion = (from: string, to: string) => {
    try {
      const piece = chess.get(from as any);
      if (!piece || piece.type !== 'p') return false;
      const rank = to[1];
      return (piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1');
    } catch { return false; }
  };
  const pointToPosition = useCallback((x: number, y: number) => {
    if (x < 0 || x > size || y < 0 || y > size) return null;
    const col = Math.floor(x / cell);
    const row = Math.floor(y / cell);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    const square = toSquare(row, col);
    return { square, row, col };
  }, [size, cell, toSquare]);

  const handleTapAtPoint = useCallback((x: number, y: number) => {
    const pos = pointToPosition(x, y);
    if (!pos) return;
    handleTap(pos.square);
  }, [pointToPosition, handleTap]);

  const beginDragAtPoint = useCallback((x: number, y: number) => {
    if (!enabled) return;
    const pos = pointToPosition(x, y);
    if (!pos) return;
    const { square } = pos;
    try {
      const piece = chess.get(square as any);
      if (!piece || (selectableColor && piece.color !== selectableColor)) return;
    } catch {
      return;
    }
    setSelected((prev) => (prev === square ? prev : square));
    startDrag(square);
    updateDrag(x, y);
  }, [enabled, pointToPosition, chess, selectableColor, startDrag, updateDrag, setSelected]);

  const finalizeInteractionAtPoint = useCallback((x: number, y: number) => {
    const activeDrag = dragRef.current;
    const pos = pointToPosition(x, y);
    const targetSquare = pos?.square ?? null;
    if (activeDrag) {
      const from = activeDrag.from;
      setSelected(null);
      stopDrag();
      if (!targetSquare) return;
      if (legalMovesFrom(fen, from).some((m) => m.to === targetSquare)) {
        if (isPromotion(from, targetSquare)) {
          const piece = chess.get(from as any);
          setPromotion({ from, to: targetSquare, color: piece?.color === 'w' ? 'w' : 'b' });
        } else {
          onMove(from, targetSquare);
        }
      } else {
        handleTap(targetSquare);
      }
      return;
    }
    if (targetSquare) handleTap(targetSquare);
  }, [pointToPosition, setSelected, stopDrag, fen, onMove, handleTap, isPromotion, chess, setPromotion]);

  const panStateRef = React.useRef<{ active: boolean; startX: number; startY: number }>({ active: false, startX: 0, startY: 0 });

  const handlePanBegin = useCallback((x: number, y: number) => {
    panStateRef.current = { active: false, startX: x, startY: y };
  }, []);

  const handlePanChange = useCallback(
    (x: number, y: number) => {
      const state = panStateRef.current;
      if (!state) return;
      if (!state.active) {
        const dx = x - state.startX;
        const dy = y - state.startY;
        const threshold = cell * 0.12;
        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
          beginDragAtPoint(state.startX, state.startY);
          panStateRef.current = { ...state, active: true };
        }
      }
      if (panStateRef.current.active) {
        updateDrag(x, y);
      }
    },
    [cell, beginDragAtPoint, updateDrag]
  );

  const handlePanFinalize = useCallback(
    (x: number, y: number) => {
      const active = panStateRef.current.active;
      panStateRef.current = { active: false, startX: 0, startY: 0 };
      if (active) {
        finalizeInteractionAtPoint(x, y);
      }
    },
    [finalizeInteractionAtPoint]
  );

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(enabled)
      .onBegin((event) => {
        if (!enabled) return;
        runOnJS(handlePanBegin)(event.x, event.y);
      })
      .onChange((event) => {
        if (!enabled) return;
        runOnJS(handlePanChange)(event.x, event.y);
      })
      .onFinalize((event) => {
        runOnJS(handlePanFinalize)(event.x, event.y);
      });
  }, [enabled, handlePanBegin, handlePanChange, handlePanFinalize]);
  const tapGesture = useMemo(() => {
    return Gesture.Tap()
      .enabled(enabled)
      .onEnd((event, success) => {
        if (!enabled || !success) return;
        runOnJS(handleTapAtPoint)(event.x, event.y);
      });
  }, [enabled, handleTapAtPoint]);

  const boardGesture = useMemo(() => Gesture.Simultaneous(panGesture, tapGesture), [panGesture, tapGesture]);

  const boardStatus = useMemo<BoardStatus | null>(() => {
    const api = chess as any;
    try {
      const checkmate = api.in_checkmate?.() || api.isCheckmate?.();
      if (checkmate) {
        const defender = api.turn?.() === 'w' ? 'White' : 'Black';
        const winner = defender === 'White' ? 'Black' : 'White';
        return { key: `mate-${fen}`, kind: 'checkmate', title: 'Checkmate', subtitle: `${winner} wins`, tone: 'success' };
      }
      if (api.in_stalemate?.()) {
        return { key: `stalemate-${fen}`, kind: 'stalemate', title: 'Stalemate', subtitle: 'Drawn game', tone: 'info' };
      }
      if (api.insufficient_material?.()) {
        return { key: `material-${fen}`, kind: 'material', title: 'Draw', subtitle: 'Insufficient material', tone: 'neutral' };
      }
      if (api.in_threefold_repetition?.()) {
        return { key: `threefold-${fen}`, kind: 'threefold', title: 'Draw', subtitle: 'Threefold repetition', tone: 'neutral' };
      }
      if (api.in_draw?.()) {
        return { key: `draw-${fen}`, kind: 'draw', title: 'Draw', subtitle: 'No more legal progress', tone: 'neutral' };
      }
      if (api.in_check?.() || api.isCheck?.()) {
        const defender = api.turn?.() === 'w' ? 'White' : 'Black';
        return { key: `check-${fen}`, kind: 'check', title: 'Check', subtitle: `${defender} king is under attack`, tone: 'warning' };
      }
    } catch {}
    return null;
  }, [chess, fen]);

  React.useEffect(() => {
    onStatusChange?.(boardStatus);
  }, [boardStatus, onStatusChange]);
  if (!font) {
    return <View style={{ width: BOARD_SIZE, height: BOARD_SIZE }} />;
  }

  return (
    <GestureDetector gesture={boardGesture}>
      <View style={{ width: size, height: size, position: 'relative', alignSelf: 'center' }}>
        <Canvas style={{ width: size, height: size }}>
          <Group>
            {Array.from({ length: 8 }).map((_, r) =>
              Array.from({ length: 8 }).map((__, c) => {
                const isLight = (r + c) % 2 === 0;
                const fill = isLight ? light : dark;
                return (
                  <Group key={`sq-${r}-${c}`}>
                    <Rect x={c * cell} y={r * cell} width={cell} height={cell} color={fill} />
                  </Group>
                );
              })
            )}
          </Group>

          {lastFrom && (() => { const { row, col } = squareToRowCol(lastFrom); return <Rect x={col * cell} y={row * cell} width={cell} height={cell} color={highlight} opacity={0.16} />; })()}
          {lastTo && (() => { const { row, col } = squareToRowCol(lastTo); return <Rect x={col * cell} y={row * cell} width={cell} height={cell} color={highlight} opacity={0.28} />; })()}

          {selected && (() => {
            const { row, col } = squareToRowCol(selected);
            return <Rect x={col * cell} y={row * cell} width={cell} height={cell} color={highlight} opacity={0.25} />;
          })()}

          {invalidSq && (() => {
            const { row, col } = squareToRowCol(invalidSq);
            return <Rect x={col * cell} y={row * cell} width={cell} height={cell} color="#ff3b30" opacity={0.35} />;
          })()}

          <Group>
            {Array.from({ length: 8 }).map((_, r) =>
              Array.from({ length: 8 }).map((__, c) => {
                const sq = toSquare(r, c);
                if (!legalTargets.has(sq)) return null;
                const cx = c * cell + cell / 2;
                const cy = r * cell + cell / 2;
                return <Circle key={`dot-${r}-${c}`} cx={cx} cy={cy} r={cell * 0.12} color={highlight} opacity={0.9} />;
              })
            )}
          </Group>
          {/* Pieces moved to AnimatedPiece overlays for unified animation surface */}
        </Canvas>
        {/* AnimatedPiece overlay layer */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }}>
          {board.map((row, r) =>
            row.map((p, c) => {
              if (!p) return null;
              const displayRow = orientation === 'w' ? r : 7 - r;
              const displayCol = orientation === 'w' ? c : 7 - c;
              const x = displayCol * cell + cell * 0.05;
              const y = displayRow * cell + cell * 0.05;
              const code = `${p.color}${p.type.toUpperCase()}` as any;
              const canonicalSquare = `${String.fromCharCode(97 + c)}${8 - r}`;
              const id = `${code}@${canonicalSquare}`;
              const uri = resolvePiece(setName, mode as any, code);
              return <AnimatedPiece key={id} id={id} x={x} y={y} size={cell * 0.9} uri={uri} />;
            })
          )}
        </View>
        {activeMove && (() => {
          const { row, col } = squareToRowCol(activeMove.to);
          const left = col * cell;
          const top = row * cell;
          return (
            <RNAnimated.View
              pointerEvents="none"
              style={{ position: 'absolute', left, top, width: cell, height: cell, transform: [{ scale: rippleScale }], opacity: rippleOpacity, borderRadius: 6, borderWidth: 2, borderColor: lastWasCapture ? '#ff3b30' : highlight }}
            />
          );
        })()}

        {((chess as any).isCheck?.() || (chess as any).in_check?.()) && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 8, alignSelf: 'center', backgroundColor: mode === 'dark' ? 'rgba(255,59,48,0.2)' : 'rgba(255,59,48,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
            <RNAnimated.Text style={{ color: '#ff3b30', fontWeight: '700' }}>Check</RNAnimated.Text>
          </View>
        )}

        {drag && (() => {
          const { row, col } = squareToRowCol(drag.from);
          const originX = col * cell + cell * 0.05;
          const originY = row * cell + cell * 0.05;
          const gx = Math.max(0, Math.min(size - cell, drag.x - cell / 2));
          const gy = Math.max(0, Math.min(size - cell, drag.y - cell / 2));
          const preview = resolvePiece(setName, mode as any, drag.code as any);
          if (!preview) return null;
          return (
            <View pointerEvents="none" style={{ position: 'absolute', left: gx, top: gy }}>
              <RNImage source={preview as any} style={{ width: cell * 0.9, height: cell * 0.9 }} resizeMode="contain" />
            </View>
          );

        })()}
        {promotion && (
          <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end' }}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={40} tint={mode as any} style={{ position: 'absolute', inset: 0 }}>
                <Pressable style={{ flex: 1 }} onPress={() => setPromotion(null)} />
              </BlurView>
            ) : (
              <Pressable style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setPromotion(null)} />
            )}
            <View style={{ backgroundColor: mode === 'dark' ? '#1C1C1E' : '#F8F8F8', padding: 16, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {(['q', 'r', 'b', 'n'] as const).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => {
                      const { from, to } = promotion;
                      setPromotion(null);
                      if (onMoveWithPromotion) onMoveWithPromotion(from, to, p);
                      else onMove(from, to);
                    }}
                    style={{ padding: 10, borderRadius: 12, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#ECECEC' }}
                  >
                    <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                      <RNAnimated.Text style={{ fontSize: 22, color: mode === 'dark' ? '#fff' : '#000', fontWeight: '700' }}>{p.toUpperCase()}</RNAnimated.Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}




