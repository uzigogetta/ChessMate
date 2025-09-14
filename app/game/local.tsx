import React, { useMemo, useState } from 'react';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { useWindowDimensions } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { START_FEN, applyMove, fenToBoard, applySANs } from '@/features/chess/logic/chess.rules';

export default function LocalGameScreen() {
  const [fen, setFen] = useState(START_FEN);
  const [history, setHistory] = useState<string[]>([]);
  const turn = useMemo(() => fenToBoard(fen).turn, [fen]);
  const { width } = useWindowDimensions();
  const fullEdge = useSettings((s) => s.fullEdgeBoard);
  const containerPad = fullEdge ? 0 : 12;
  const boardSize = Math.floor(width - (fullEdge ? 0 : 24));
  return (
    <Screen style={{ paddingHorizontal: containerPad }}>
      <Card style={{ marginBottom: 16 }}>
        <Text>{`Local — Turn: ${turn === 'w' ? 'White' : 'Black'}`}</Text>
      </Card>
      <BoardSkia
        fen={fen}
        size={boardSize}
        onMove={(from, to) => {
          const r = applyMove(fen, { from, to });
          if (r.ok) {
            setFen(r.fen);
            setHistory((h) => [...h, r.san]);
          }
        }}
      />
      <Button title="Undo" onPress={async () => {
        const next = history.slice(0, -1);
        const newFen = await applySANs(next);
        setHistory(next);
        setFen(newFen);
      }} />
      <Button title="Reset" onPress={() => setFen(START_FEN)} />
    </Screen>
  );
}


