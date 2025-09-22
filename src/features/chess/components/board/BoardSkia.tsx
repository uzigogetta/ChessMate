import React, { useMemo, useState, useCallback } from 'react';
import { View, GestureResponderEvent, Animated as RNAnimated, Platform, Pressable, Easing } from 'react-native';
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
};

const BOARD_SIZE = 320;

export function BoardSkia({ fen, onMove, onMoveWithPromotion, onOptimisticMove, orientation = 'w', enabled = true, selectableColor, flashSquare, size: sizeProp, lastFrom, lastTo, lastWasCapture }: Props) {
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
          if (onOptimisticMove) {
            setOptimistic({ from, to });
            const rollback = () => setOptimistic(null);
            onOptimisticMove(from, to, rollback);
          } else {
            onMove(from, to);
          }
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

  // Move ripple animation on lastTo
  const pulse = React.useRef(new RNAnimated.Value(0)).current;
  React.useEffect(() => {
    if (!lastTo) return;
    pulse.setValue(0);
    RNAnimated.sequence([
      RNAnimated.timing(pulse, { toValue: 1, duration: 220, useNativeDriver: true }),
      RNAnimated.timing(pulse, { toValue: 0, duration: 220, useNativeDriver: true })
    ]).start();
  }, [lastTo]);
  const rippleScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.08] });
  const rippleOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.0, 0.5] });

  // Drag-and-drop state
  const [drag, setDrag] = React.useState<{ from: string; x: number; y: number; code: string } | null>(null);
  const startDrag = (sq: string) => {
    const piece = chess.get(sq as any);
    if (!piece) return;
    setDrag({ from: sq, x: 0, y: 0, code: `${piece.color}${piece.type.toUpperCase()}` });
  };
  const updateDrag = (x: number, y: number) => setDrag((d) => (d ? { ...d, x, y } : d));
  const stopDrag = () => setDrag(null);

  // Promotion overlay
  const [promotion, setPromotion] = React.useState<null | { from: string; to: string; color: 'w'|'b' }>(null);
  // Haptics + sounds
  const soundsEnabled = useSettings((s) => s.sounds);
  const moveSound = React.useRef<any>(null);
  const captureSound = React.useRef<any>(null);
  const checkSound = React.useRef<any>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!soundsEnabled || !(SND.move || SND.capture || SND.check)) return;
        const mod: any = await import('expo-av').catch(() => null);
        const Audio = mod?.Audio;
        if (!Audio) return;
        if (SND.move) { const [mv] = await Audio.Sound.createAsync(SND.move); if (!mounted) { mv.unloadAsync(); return; } moveSound.current = mv; }
        if (SND.capture) { const [cap] = await Audio.Sound.createAsync(SND.capture); if (!mounted) { cap.unloadAsync(); return; } captureSound.current = cap; }
        if (SND.check) { const [chk] = await Audio.Sound.createAsync(SND.check); if (!mounted) { chk.unloadAsync(); return; } checkSound.current = chk; }
      } catch {}
    })();
    return () => { mounted = false; try { moveSound.current?.unloadAsync(); captureSound.current?.unloadAsync(); checkSound.current?.unloadAsync(); } catch {} };
  }, []);
  const playMoveFx = (wasCapture: boolean, wasCheck: boolean) => {
    try { if (useSettings.getState().haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    try {
      if (!soundsEnabled) return;
      if (wasCheck && checkSound.current) checkSound.current.replayAsync();
      else if (wasCapture && captureSound.current) captureSound.current.replayAsync();
      else if (moveSound.current) moveSound.current.replayAsync();
    } catch {}
  };

  // Play on lastTo updates
  React.useEffect(() => {
    if (!lastTo) return;
    const isCheck = (chess as any).isCheck?.() || (chess as any).in_check?.();
    playMoveFx(!!lastWasCapture, !!isCheck);
  }, [lastTo]);
  const isPromotion = (from: string, to: string) => {
    try {
      const piece = chess.get(from as any);
      if (!piece || piece.type !== 'p') return false;
      const rank = to[1];
      return (piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1');
    } catch { return false; }
  };

  if (!font) {
    return <View style={{ width: BOARD_SIZE, height: BOARD_SIZE }} />;
  }

  return (
    <View style={{ width: size, height: size, position: 'relative', alignSelf: 'center' }}>
      <Canvas style={{ width: size, height: size }}>
        {/* squares */}
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

        {/* last move highlights */}
        {lastFrom && (() => { const { row, col } = squareToRowCol(lastFrom); return <Rect x={col * cell} y={row * cell} width={cell} height={cell} color={highlight} opacity={0.16} />; })()}
        {lastTo && (() => { const { row, col } = squareToRowCol(lastTo); return <Rect x={col * cell} y={row * cell} width={cell} height={cell} color={highlight} opacity={0.28} />; })()}

        {/* selected highlight */}
        {selected && (() => {
          const { row, col } = squareToRowCol(selected);
          return <Rect x={col * cell} y={row * cell} width={cell} height={cell} color={highlight} opacity={0.25} />;
        })()}

        {/* invalid tap flash */}
        {invalidSq && (() => {
          const { row, col } = squareToRowCol(invalidSq);
          return <Rect x={col * cell} y={row * cell} width={cell} height={cell} color="#ff3b30" opacity={0.35} />;
        })()}

        {/* legal dots */}
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
        {/* pieces using Skia Text */}
        <Group>
          {board.map((row, r) =>
            row.map((p, c) => {
              if (!p) return null;
              const dr = orientation === 'w' ? r : 7 - r;
              const dc = orientation === 'w' ? c : 7 - c;
              const x = dc * cell;
              const y = dr * cell;
              const code = `${p.color}${p.type.toUpperCase()}` as any;
              const img = imgMap[code];
              if (img) {
                const cx = x + cell / 2;
                const cy = y + cell / 2;
                const ring = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                const radius = cell * 0.44;
                if (pieceSet === 'native') {
                  return (
                    <Group key={`p-${r}-${c}`}>
                      <Circle cx={cx} cy={cy} r={radius} color={ring} />
                      <SkiaImage image={img} x={x + cell * 0.05} y={y + cell * 0.05} width={cell * 0.9} height={cell * 0.9} />
                    </Group>
                  );
                }
                return <SkiaImage key={`p-${r}-${c}`} image={img} x={x + cell * 0.05} y={y + cell * 0.05} width={cell * 0.9} height={cell * 0.9} />;
              }
              // fallback: simple letter circle
              const letter = p.type.toUpperCase();
              const cx = x + cell / 2;
              const cy = y + cell / 2;
              const ring = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
              const radius = cell * 0.44;
              return (
                <Group key={`pl-${r}-${c}`}>
                  <Circle cx={cx} cy={cy} r={radius} color={ring} />
                  <SkiaText text={letter} x={x + cell * 0.34} y={y + cell * 0.66} color={mode === 'dark' ? '#fff' : '#000'} font={font} />
                </Group>
              );
            })
          )}
        </Group>
      </Canvas>
      {/* Move slide overlay */}
      {lastFrom && lastTo && (() => {
        try {
          const moved = chess.get(lastTo as any);
          if (!moved) return null;
          const code = `${moved.color}${moved.type.toUpperCase()}` as string;
          const { row: fr, col: fc } = squareToRowCol(lastFrom);
          const { row: tr, col: tc } = squareToRowCol(lastTo);
          const fromX = fc * cell + cell * 0.05;
          const fromY = fr * cell + cell * 0.05;
          const toX = tc * cell + cell * 0.05;
          const toY = tr * cell + cell * 0.05;
          const prog = React.useRef(new RNAnimated.Value(0)).current;
          React.useEffect(() => {
            prog.setValue(0);
            RNAnimated.timing(prog, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
          }, [lastFrom, lastTo]);
          const x = prog.interpolate({ inputRange: [0, 1], outputRange: [fromX, toX] });
          const y = prog.interpolate({ inputRange: [0, 1], outputRange: [fromY, toY] });
          const img = imgMap[code];
          if (!img) return null;
          return (
            <RNAnimated.View pointerEvents="none" style={{ position: 'absolute', left: x as any, top: y as any }}>
              <SkiaImage image={img} x={0} y={0} width={cell * 0.9} height={cell * 0.9} />
            </RNAnimated.View>
          );
        } catch { return null; }
      })()}
      {/* Animated ripple at lastTo */}
      {lastTo && (() => {
        const { row, col } = squareToRowCol(lastTo);
        const left = col * cell;
        const top = row * cell;
        return (
          <RNAnimated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left,
              top,
              width: cell,
              height: cell,
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: lastWasCapture ? '#ff3b30' : highlight,
            }}
          />
        );
      })()}
      {/* Check banner */}
      {((chess as any).isCheck?.() || (chess as any).in_check?.()) && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 8, alignSelf: 'center', backgroundColor: mode === 'dark' ? 'rgba(255,59,48,0.2)' : 'rgba(255,59,48,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
          <RNAnimated.Text style={{ color: '#ff3b30', fontWeight: '700' }}>Check</RNAnimated.Text>
        </View>
      )}
      {/* Touch overlay to handle taps/select & move */}
      <View
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        onStartShouldSetResponder={() => !!enabled}
        onResponderMove={(e: GestureResponderEvent) => {
          if (!enabled) return;
          const { locationX, locationY } = e.nativeEvent;
          if (selected && !drag) {
            startDrag(selected);
          }
          if (drag) updateDrag(locationX, locationY);
        }}
        onResponderRelease={(e: GestureResponderEvent) => {
          if (!enabled) return;
          const { locationX, locationY } = e.nativeEvent;
          const col = Math.floor(locationX / cell);
          const row = Math.floor(locationY / cell);
          if (col < 0 || col > 7 || row < 0 || row > 7) return;
          const sq = toSquare(row, col);
          if (drag) {
            const from = drag.from;
            const to = sq;
            setSelected(null);
            stopDrag();
            if (legalMovesFrom(fen, from).some((m) => m.to === to)) {
              if (isPromotion(from, to)) {
                const piece = chess.get(from as any);
                setPromotion({ from, to, color: piece?.color === 'w' ? 'w' : 'b' });
              } else {
                onMove(from, to);
              }
            }
            return;
          }
          handleTap(sq);
        }}
      />
      {/* Drag ghost */}
      {drag && (() => {
        const { row, col } = squareToRowCol(drag.from);
        const originX = col * cell + cell * 0.05;
        const originY = row * cell + cell * 0.05;
        const gx = Math.max(0, Math.min(size - cell, drag.x - cell / 2));
        const gy = Math.max(0, Math.min(size - cell, drag.y - cell / 2));
        const img = imgMap[drag.code];
        return img ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: gx, top: gy }}>
            <SkiaImage image={img} x={0} y={0} width={cell * 0.9} height={cell * 0.9} />
          </View>
        ) : null;
      })()}

      {/* Promotion sheet */}
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
              {(['q','r','b','n'] as const).map((p) => (
                <Pressable key={p} onPress={() => { const { from, to } = promotion; setPromotion(null); if (onMoveWithPromotion) onMoveWithPromotion(from, to, p); else onMove(from, to); }} style={{ padding: 10, borderRadius: 12, backgroundColor: mode === 'dark' ? '#2C2C2E' : '#ECECEC' }}>
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
  );
}

export default BoardSkia;


