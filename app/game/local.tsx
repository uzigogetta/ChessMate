import React, { useMemo, useState } from 'react';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { useWindowDimensions, ScrollView } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { START_FEN, applyMove, fenToBoard, applySANs } from '@/features/chess/logic/chess.rules';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

export default function LocalGameScreen() {
  const [fen, setFen] = useState(START_FEN);
  const [history, setHistory] = useState<string[]>([]);
  const turn = useMemo(() => fenToBoard(fen).turn, [fen]);
  const { width } = useWindowDimensions();
  const fullEdge = useSettings((s) => s.fullEdgeBoard);
  const containerPad = fullEdge ? 0 : 12;
  const boardSize = Math.floor(width - (fullEdge ? 0 : 24));
  const insets = useSafeAreaInsets();
  return (
    <Screen style={{ paddingTop: 0, paddingHorizontal: containerPad }}>
      <Stack.Screen options={{ headerTitle: 'Local Game' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, alignItems: 'center', justifyContent: 'flex-start', gap: 12, paddingBottom: 24 }}>
        <Card>
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
          const cut = history.length >= 2 ? history.length - 2 : 0;
          const next = history.slice(0, cut);
          const newFen = await applySANs(next);
          setHistory(next);
          setFen(newFen);
        }} />
        <Button title="Reset" onPress={() => setFen(START_FEN)} />
      </ScrollView>
    </Screen>
  );
}


