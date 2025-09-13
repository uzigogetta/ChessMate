import React, { useMemo, useState } from 'react';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { START_FEN, applyMove, fenToBoard } from '@/features/chess/logic/chess.rules';

export default function LocalGameScreen() {
  const [fen, setFen] = useState(START_FEN);
  const turn = useMemo(() => fenToBoard(fen).turn, [fen]);
  return (
    <Screen>
      <Card style={{ marginBottom: 16 }}>
        <Text>{`Local — Turn: ${turn === 'w' ? 'White' : 'Black'}`}</Text>
      </Card>
      <BoardSkia
        fen={fen}
        onMove={(from, to) => {
          const r = applyMove(fen, { from, to });
          if (r.ok) setFen(r.fen);
        }}
      />
      <Button title="Reset" onPress={() => setFen(START_FEN)} />
    </Screen>
  );
}


