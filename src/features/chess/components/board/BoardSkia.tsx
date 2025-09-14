import React, { useMemo, useState, useCallback } from 'react';
import { View } from 'react-native';
import { Canvas, Rect, Group, Circle, Text as SkiaText } from '@shopify/react-native-skia';
import { colors as uiColors } from '@/ui/tokens';
import { useBoardTheme } from '@/ui/useBoardTheme';
import { fenToBoard, legalMovesFrom } from '@/features/chess/logic/chess.rules';
import { usePieceFont } from '@/ui/fonts';

type Props = {
  fen: string;
  onMove: (from: string, to: string) => void;
  onOptimisticMove?: (from: string, to: string, rollback: () => void) => void;
  coords?: boolean;
  orientation?: 'w' | 'b';
  enabled?: boolean;
  selectableColor?: 'w' | 'b';
};

const BOARD_SIZE = 320;

export function BoardSkia({ fen, onMove, onOptimisticMove, orientation = 'w', enabled = true, selectableColor }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<{ from: string; to: string } | null>(null);
  const [invalidSq, setInvalidSq] = useState<string | null>(null);
  const { chess } = fenToBoard(fen);
  const board = chess.board();

  const boardTheme = useBoardTheme();
  const light = boardTheme.light;
  const dark = boardTheme.dark;
  const highlight = uiColors?.accent ?? '#00E0B8';

  const cell = BOARD_SIZE / 8;
  const font = usePieceFont(cell * 0.55);

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
    <View style={{ width: BOARD_SIZE, height: BOARD_SIZE, position: 'relative' }}>
      <Canvas style={{ width: BOARD_SIZE, height: BOARD_SIZE }}>
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
              const glyph = p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
              const dr = orientation === 'w' ? r : 7 - r;
              const dc = orientation === 'w' ? c : 7 - c;
              const cx = dc * cell + cell / 2;
              const cy = dr * cell + cell / 2;
              const metrics = font.measureText(glyph);
              return (
                <SkiaText
                  key={`p-${r}-${c}`}
                  text={glyph}
                  x={cx - metrics.width / 2}
                  y={cy + font.getSize() * 0.35}
                  font={font}
                  color={p.color === 'w' ? boardTheme.pieces.white : boardTheme.pieces.black}
                />
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


