import React, { useEffect, useMemo, useState } from 'react';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { START_FEN, applyMove, fenToBoard, sideToMove, applySANs } from '@/features/chess/logic/chess.rules';
import { MockEngine } from '@/features/chess/engine/engine.mock';

export default function AIGameScreen() {
  const [fen, setFen] = useState(START_FEN);
  const [history, setHistory] = useState<string[]>([]);
  const [mySide, setMySide] = useState<'white' | 'black'>('white');
  const [thinking, setThinking] = useState(false);
  const engine = useMemo(() => new MockEngine(), []);
  useEffect(() => {
    engine.init();
  }, [engine]);
  const turn = useMemo(() => fenToBoard(fen).turn, [fen]);
  return (
    <Screen>
      <Card style={{ marginBottom: 16 }}>
        <Text>
          {`AI — Turn: ${turn === 'w' ? 'White' : 'Black'} ${thinking ? '(thinking…)' : ''}`}
        </Text>
      </Card>
      <BoardSkia
        fen={fen}
        onMove={(from, to) => {
          if (thinking) return;
          const r = applyMove(fen, { from, to });
          if (r.ok) {
            setFen(r.fen);
            setHistory((h) => [...h, r.san]);
          }
        }}
      />
      <Button title="Swap Sides" onPress={() => {
        setMySide((s) => (s === 'white' ? 'black' : 'white'));
        // trigger effect if AI should move first
        setFen((f) => f);
      }} />
      <Button title="Undo" onPress={async () => {
        const next = history.slice(0, -1);
        const newFen = await applySANs(next);
        setHistory(next);
        setFen(newFen);
      }} />
      <Button title="Reset" onPress={() => {
        setHistory([]);
        setFen(START_FEN);
        // trigger effect to let AI move first if black
        setFen((f) => f);
      }} />
      <AIGameEffects
        fen={fen}
        mySide={mySide}
        engine={engine}
        setThinking={setThinking}
        setFen={setFen}
        setHistory={setHistory}
      />
    </Screen>
  );
}

// Trigger AI when it's AI's turn
export function AIGameEffects({ fen, mySide, engine, setThinking, setFen, setHistory }: any) {
  useEffect(() => {
    const turn = sideToMove(fen);
    const aiIs = mySide === 'white' ? 'b' : 'w';
    if (turn === aiIs) {
      setThinking(true);
      engine.bestMove(fen, 350).then((m: any) => {
        setThinking(false);
        const r = applyMove(fen, { from: m.from, to: m.to });
        if (r.ok) {
          setFen(r.fen);
          setHistory((h: string[]) => [...h, m.san]);
        }
      });
    }
  }, [fen, mySide, engine, setFen, setHistory, setThinking]);
  return null;
}


