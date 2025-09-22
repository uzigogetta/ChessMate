import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { useWindowDimensions, ScrollView, Pressable } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { START_FEN, applyMove, fenToBoard, sideToMove, applySANs } from '@/features/chess/logic/chess.rules';
import { MockEngine } from '@/features/chess/engine/engine.mock';
import { StockfishEngine } from '@/features/chess/engine/stockfish.engine';
import { detectTerminal } from '@/game/terminal';
import { buildPGN } from '@/archive/pgn';
import { insertGame } from '@/archive/db';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AIGameScreen() {
  const [fen, setFen] = useState(START_FEN);
  const [history, setHistory] = useState<string[]>([]);
  const [mySide, setMySide] = useState<'white' | 'black'>('white');
  const [thinking, setThinking] = useState(false);
  const params = useLocalSearchParams();
  const levelParam = Number(params.level || 4);
  const level = (Number.isFinite(levelParam) && levelParam >=1 && levelParam <=12 ? (levelParam as any) : 4);
  // Prefer real Stockfish; fallback to MockEngine if not healthy
  const [engine, setEngine] = useState<any>(() => new StockfishEngine({ movetimeMs: 300, skill: level }));
  const [engineStatus, setEngineStatus] = useState<'init'|'stockfish'|'fallback'|'error'>('init');
  useEffect(() => {
    // when level changes, recreate stockfish engine
    setEngine(new StockfishEngine({ movetimeMs: 300, skill: level }));
    setEngineStatus('init');
  }, [level]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await engine.init?.();
        // quick healthcheck
        const test = await engine.bestMove?.(START_FEN, 120);
        if (!cancelled && test && test.from && test.to) setEngineStatus('stockfish');
      } catch (e) {
        if (!cancelled) {
          setEngineStatus('fallback');
          setEngine(new MockEngine());
        }
      }
    })();
    return () => { cancelled = true; };
  }, [engine]);
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
  return (
    <Screen style={{ paddingTop: 0, paddingHorizontal: containerPad }}>
      <Stack.Screen options={{ headerTitle: 'AI Game', headerRight: () => {
        const color = engineStatus === 'stockfish' ? '#16a34a' : engineStatus === 'fallback' ? '#64748b' : engineStatus === 'error' ? '#ef4444' : '#f59e0b';
        const label = engineStatus === 'stockfish' ? 'SF' : engineStatus === 'fallback' ? 'FB' : engineStatus === 'error' ? 'ERR' : '…';
        return (
          <Pressable
            onPress={() => {
              if (engineStatus === 'stockfish') { setEngine(new MockEngine()); setEngineStatus('fallback'); }
              else { setEngine(new StockfishEngine({ movetimeMs: 300, skill: level })); setEngineStatus('init'); }
            }}
            style={{ marginRight: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: color }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>{label}</Text>
          </Pressable>
        );
      } }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, alignItems: 'center', justifyContent: 'flex-start', gap: 12, paddingBottom: 24 }}>
        <Card>
          <Text>
            {`AI — Turn: ${turn === 'w' ? 'White' : 'Black'} ${thinking ? '(thinking…)' : ''}`}
          </Text>
        </Card>
        <BoardSkia
          fen={fen}
          size={boardSize}
          lastFrom={lastFromSq as any}
          lastTo={lastToSq as any}
          lastWasCapture={lastWasCapture}
          onMoveWithPromotion={(from, to, promo) => {
            if (thinking) return;
            // Apply with promotion: build SAN by trying move with promotion letter
            const r = applyMove(fen, { from, to, promotion: promo as any });
            if (r.ok) {
              setFen(r.fen);
              setHistory((h) => {
                const updated = [...h, r.san];
                const t = detectTerminal('', updated);
                if (t.over) { saveAiArchive(updated, t.result as any); }
                return updated;
              });
              lastHumanMove.current = { from, to };
              setLastFromSq(from);
              setLastToSq(to);
              const wasCap = r.san.includes('x');
              setLastWasCapture(wasCap);
            }
          }}
          onMove={(from, to) => {
            if (thinking) return;
            const r = applyMove(fen, { from, to });
            if (r.ok) {
              setFen(r.fen);
              setHistory((h) => {
                const updated = [...h, r.san];
                const t = detectTerminal('', updated);
                if (t.over) { saveAiArchive(updated, t.result as any); }
                return updated;
              });
              // Record last human move; AI effect will exclude instant reversals
              lastHumanMove.current = { from, to };
              setLastFromSq(from);
              setLastToSq(to);
              const wasCap = r.san.includes('x');
              setLastWasCapture(wasCap);
            }
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
          setFen(newFen);
        }} />
        <Button title="Reset" onPress={() => {
          setHistory([]);
          setFen(START_FEN);
          setFen((f) => f);
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
          level={level}
        />
      </ScrollView>
    </Screen>
  );
}

// Trigger AI when it's AI's turn
export function AIGameEffects({ fen, mySide, engine, setThinking, setFen, setHistory, thinking, lastHumanMoveRef, level }: any) {
  useEffect(() => {
    const turn = sideToMove(fen);
    const aiIs = mySide === 'white' ? 'b' : 'w';
    if (turn === aiIs) {
      const delayByLevel = [120, 180, 220, 280, 360, 420, 520, 650];
      const postMoveDelay = [80, 100, 120, 140, 160, 180, 200, 240];
      const idx = Math.max(1, Math.min(8, level || 4)) - 1;
      const preDelay = delayByLevel[idx];
      const postDelay = postMoveDelay[idx];
      setThinking(true);
      const tm = setTimeout(() => {
        const last = lastHumanMoveRef?.current;
        const exclude = last ? [`${last.to}${last.from}`] : [];
        engine.bestMove(fen, 300 + idx * 60, exclude).then((m: any) => {
          setTimeout(() => {
            setThinking(false);
            const r = applyMove(fen, { from: m.from, to: m.to });
            if (r.ok) {
              setFen(r.fen);
              setHistory((h: string[]) => {
                const updated = [...h, m.san];
                const t = detectTerminal('', updated);
                if (t.over) { saveAiArchive(updated, t.result as any); }
                return updated;
              });
            }
          }, postDelay);
        });
      }, preDelay + Math.floor(Math.random() * 120));
      return () => clearTimeout(tm);
    }
  }, [fen, mySide, engine, setFen, setHistory, setThinking]);
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


