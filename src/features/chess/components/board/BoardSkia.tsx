import React, { useMemo, useState, useCallback } from 'react';
import { View } from 'react-native';
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
  onOptimisticMove?: (from: string, to: string, rollback: () => void) => void;
  coords?: boolean;
  orientation?: 'w' | 'b';
  enabled?: boolean;
  selectableColor?: 'w' | 'b';
  flashSquare?: string | null;
  size?: number;
};

const BOARD_SIZE = 320;

export function BoardSkia({ fen, onMove, onOptimisticMove, orientation = 'w', enabled = true, selectableColor, flashSquare, size: sizeProp }: Props) {
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
              const radius = cell * 0.36;
              const bg = p.color === 'w' ? boardTheme.pieces.white : boardTheme.pieces.black;
              const fg = p.color === 'w' ? '#1C1C1E' : '#F2F2F7';
              const metrics = font.measureText(letter);
              return (
                <Group key={`p-${r}-${c}`}>
                  <Circle cx={cx} cy={cy} r={radius} color={bg} />
                  <SkiaText text={letter} x={cx - metrics.width / 2} y={cy + font.getSize() * 0.35} font={font} color={fg} />
                </Group>
              );
            })
          )}
        </Group>

        {/* optimistic overlay: dim board and show small indicator */}
        {optimistic && (
          <Group>
            <Rect x={0} y={0} width={BOARD_SIZE} height={BOARD_SIZE} color={highlight} opacity={0.06} />
          </Group>
        )}
      </Canvas>

      {/* touch overlay */}
      <View
        pointerEvents={'box-only'}
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        onStartShouldSetResponder={() => true}
        onStartShouldSetResponderCapture={() => true}
        onResponderRelease={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          const col = Math.floor(locationX / cell);
          const row = Math.floor(locationY / cell);
          const sq = toSquare(row, col);
          handleTap(sq);
        }}
      />
    </View>
  );
}

export default BoardSkia;


