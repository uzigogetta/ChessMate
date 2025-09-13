import React, { useMemo, useState, useCallback } from 'react';
import { View } from 'react-native';
import { Canvas, Rect, Group, Circle, Text as SkiaText } from '@shopify/react-native-skia';
import { colors as uiColors } from '@/ui/tokens';
import { fenToBoard, legalMovesFrom } from '@/features/chess/logic/chess.rules';
import { usePieceFont } from '@/ui/fonts';

type Props = { fen: string; onMove: (from: string, to: string) => void; coords?: boolean };

const BOARD_SIZE = 320;

export function BoardSkia({ fen, onMove }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { chess } = fenToBoard(fen);
  const board = chess.board();

  const light = uiColors?.card ?? '#edeff2';
  const dark = uiColors?.muted ?? '#6b7688';
  const highlight = uiColors?.accent ?? '#00E0B8';

  const cell = BOARD_SIZE / 8;
  const font = usePieceFont(cell * 0.55);

  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(legalMovesFrom(fen, selected).map((m) => m.to));
  }, [fen, selected]);

  const toSquare = useCallback((row: number, col: number) => {
    const files = 'abcdefgh';
    const ranks = '87654321';
    return `${files[col]}${ranks[row]}`;
  }, []);

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
      if (piece && piece.color === chess.turn()) setSelected(sq);
      else setSelected(null);
    },
    [chess, legalTargets, onMove, selected]
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
          const file = selected.charCodeAt(0) - 'a'.charCodeAt(0);
          const rank = 8 - Number(selected[1]);
          return <Rect x={file * cell} y={rank * cell} width={cell} height={cell} color={highlight} opacity={0.25} />;
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
              const cx = c * cell + cell / 2;
              const cy = r * cell + cell / 2;
              const metrics = font.measureText(glyph);
              return (
                <SkiaText
                  key={`p-${r}-${c}`}
                  text={glyph}
                  x={cx - metrics.width / 2}
                  y={cy + font.getSize() * 0.35}
                  font={font}
                  color={p.color === 'w' ? '#ffffff' : '#121212'}
                />
              );
            })
          )}
        </Group>
      </Canvas>

      {/* touch overlay */}
      <View
        pointerEvents="box-only"
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        onStartShouldSetResponder={() => true}
        onResponderRelease={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          const col = Math.floor(locationX / cell);
          const row = Math.floor(locationY / cell);
          const files = 'abcdefgh';
          const file = files[col];
          const rank = 8 - row;
          const sq = `${file}${rank}`;
          handleTap(sq);
        }}
      />
    </View>
  );
}

export default BoardSkia;


