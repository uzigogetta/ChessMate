import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { useWindowDimensions, ScrollView, Pressable } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { BoardStatusBanner } from '@/features/chess/components/board/BoardStatusBanner';
import type { BoardStatus } from '@/features/chess/components/board/BoardCore';
import { START_FEN, applyMove, fenToBoard, sideToMove, applySANs } from '@/features/chess/logic/chess.rules';
import { MockEngine } from '@/features/chess/engine/engine.mock';
import { StockfishEngine } from '@/features/chess/engine/stockfish.engine';
import { detectTerminal } from '@/game/terminal';
import { buildPGN } from '@/archive/pgn';
import { insertGame } from '@/archive/db';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { themes, ThemeName } from '@/ui/tokens';
import { getTheme } from '@/ui/tokens';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useReview } from '@/features/view/review.store';
import { BottomBar } from '@/features/game/BottomBar';
import { toast } from '@/ui/toast';
import { ThemeName as TN2 } from '@/ui/tokens';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SND } from '../../assets/snd';
import { AnimRegistryProvider } from '@/features/chess/animation/AnimRegistry';
import { useMoveResolver } from '@/features/chess/animation/MoveResolver';
import { CommentaryStrip, createCommentarySession } from '@/features/commentary';

const AI_PERSONA = {
  name: 'Stockfish 17',
  title: 'Grandmaster Engine',
  fallback: '🤖',
  gradient: ['rgba(67,97,238,0.36)', 'rgba(25,25,35,0.6)'],
};

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
  const [boardStatus, setBoardStatus] = useState<BoardStatus | null>(null);
  const [orientation, setOrientation] = useState<'w'|'b'>('w');
  const router = useRouter();
  const sys = useColorScheme();
  const settingsVals = useSettings();
  const modeName: ThemeName = (settingsVals.theme === 'system' ? (sys === 'dark' ? 'dark' : 'light') : settingsVals.theme) as ThemeName;
  const BAR_HEIGHT = 64;
  const bottomPad = Math.max(insets.bottom, 12) + BAR_HEIGHT + 16;
  const { play, invalid } = useMoveResolver();
  const commentarySessionRef = useRef(createCommentarySession({ mode: 'ai', playerName: 'You', opponentName: 'Stockfish', aiLevel: level }));
  const [commentaryRoomId, setCommentaryRoomId] = useState(commentarySessionRef.current.getRoomId());
  const historyRef = useRef<string[]>(history);
  const fenRef = useRef<string>(fen);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  useEffect(() => {
    commentarySessionRef.current.updateMeta({
      playerName: mySide === 'white' ? 'You (White)' : 'You (Black)',
      opponentName: mySide === 'white' ? 'Stockfish (Black)' : 'Stockfish (White)',
      aiLevel: level,
    });
    setCommentaryRoomId(commentarySessionRef.current.getRoomId());
  }, [mySide, level]);

  useEffect(() => {
    commentarySessionRef.current.updateMeta({
      playerName: orientation === 'w' ? 'You (White)' : 'You (Black)',
      opponentName: orientation === 'w' ? 'Stockfish (Black)' : 'Stockfish (White)',
    });
    setCommentaryRoomId(commentarySessionRef.current.getRoomId());
  }, [orientation]);

  const emitCommentary = useCallback((prevFen: string, nextFen: string, san: string, historySAN: string[]) => {
    const moverColor = fenToBoard(prevFen).turn;
    const moverRole = moverColor === (mySide === 'white' ? 'w' : 'b') ? 'player' : 'ai';
    commentarySessionRef.current.emitMove({
      prevFen,
      nextFen,
      moveSan: san,
      mover: moverRole,
      color: moverColor,
      historySAN,
    });
  }, [mySide]);
  const squareToPixel = React.useCallback((sq: string) => {
    const file = sq[0];
    const rank = sq[1];
    const col = ('abcdefgh').indexOf(file); // canonical mapping
    const row = 8 - parseInt(rank, 10);
    const rr = orientation === 'w' ? row : 7 - row;
    const cc = orientation === 'w' ? col : 7 - col;
    const cell = boardSize / 8;
    return { x: cc * cell + cell * 0.05, y: rr * cell + cell * 0.05 };
  }, [orientation, boardSize]);

  const handleBoardStatus = React.useCallback((next: BoardStatus | null) => {
    setBoardStatus((prev) => {
      if (prev?.key === next?.key) return prev;
      return next ?? null;
    });
  }, []);

  // Play game start sound only when arriving on a fresh board
  useEffect(() => {
    (async () => {
      try {
        if (!useSettings.getState().sounds) return;
        if (fen !== START_FEN || history.length !== 0) return;
        if (!(SND as any).game_start) return;
        const AudioModule = await import('expo-audio');
        const player = AudioModule.createAudioPlayer((SND as any).game_start);
        player?.play?.();
      } catch {}
    })();
    // run only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <AnimRegistryProvider>
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
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, alignItems: 'center', justifyContent: 'flex-start', gap: 12, paddingBottom: bottomPad }}>
        <Card>
          <Text>
            {`AI — Turn: ${turn === 'w' ? 'White' : 'Black'} ${thinking ? '(thinking…)' : ''}`}
          </Text>
        </Card>
        <BoardStatusBanner status={boardStatus} style={{ paddingHorizontal: fullEdge ? 0 : 12 }} />
        <CommentaryStrip roomId={commentaryRoomId} persona={AI_PERSONA} evaluation={thinking ? 'Thinking…' : undefined} style={{ width: boardSize, alignSelf: 'center' }} />
        <BoardSkia
          onStatusChange={handleBoardStatus}
          fen={fen}
          size={boardSize}
          moveIndex={history.length}
          lastFrom={lastFromSq as any}
          lastTo={lastToSq as any}
          lastWasCapture={lastWasCapture}
          orientation={orientation}
          onMoveWithPromotion={(from, to, promo) => {
            if (thinking) return;
            // Apply with promotion: build SAN by trying move with promotion letter
            const r = applyMove(fen, { from, to, promotion: promo as any });
            if (!r.ok) { invalid(`${from}`); return; }
            const pre = fenToBoard(fen).chess;
            const mover = pre.get(from as any);
            const victim = pre.get(to as any);
            const moverCode = mover ? `${mover.color}${String(mover.type).toUpperCase()}` : 'wP';
            const moverId = `${moverCode}@${from}`;
            const captureId = victim ? `${victim.color}${String(victim.type).toUpperCase()}@${to}` : undefined;
            const toPixel = squareToPixel(to);
            lastHumanMove.current = { from, to };
            play({
              moverId,
              toPixel,
              captureId,
              onApplyMove: () => {
                setFen(r.fen);
                setHistory((h) => {
                  const updated = [...h, r.san];
                  emitCommentary(fenRef.current, r.fen, r.san, updated);
                  const t = detectTerminal('', updated);
                  if (t.over) { saveAiArchive(updated, t.result as any); }
                  return updated;
                });
                setLastFromSq(from);
                setLastToSq(to);
                setLastWasCapture(r.san.includes('x'));
              },
            });
          }}
          onMove={(from, to) => {
            if (thinking) return;
            const r = applyMove(fen, { from, to });
            if (!r.ok) { invalid(`${from}`); return; }
            const pre = fenToBoard(fen).chess;
            const mover = pre.get(from as any);
            const victim = pre.get(to as any);
            const moverCode = mover ? `${mover.color}${String(mover.type).toUpperCase()}` : 'wP';
            const moverId = `${moverCode}@${from}`;
            const captureId = victim ? `${victim.color}${String(victim.type).toUpperCase()}@${to}` : undefined;
            const toPixel = squareToPixel(to);
            lastHumanMove.current = { from, to };
            play({
              moverId,
              toPixel,
              captureId,
              onApplyMove: () => {
                setFen(r.fen);
                setHistory((h) => {
                  const updated = [...h, r.san];
                  emitCommentary(fenRef.current, r.fen, r.san, updated);
                  const t = detectTerminal('', updated);
                  if (t.over) { saveAiArchive(updated, t.result as any); }
                  return updated;
                });
                setLastFromSq(from);
                setLastToSq(to);
                setLastWasCapture(r.san.includes('x'));
              },
            });
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
          historyRef.current = next;
          setFen(newFen);
          fenRef.current = newFen;
          commentarySessionRef.current.reset(next, newFen);
          setCommentaryRoomId(commentarySessionRef.current.getRoomId());
        }} />
        <Button title="Reset" onPress={() => {
          setHistory([]);
          historyRef.current = [];
          setFen(START_FEN);
          fenRef.current = START_FEN;
          setLastFromSq(null);
          setLastToSq(null);
          setLastWasCapture(false);
          commentarySessionRef.current.reset([], START_FEN);
          setCommentaryRoomId(commentarySessionRef.current.getRoomId());
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
          play={play}
          squareToPixel={squareToPixel}
          setLastFrom={setLastFromSq}
          setLastTo={setLastToSq}
          setLastWasCapture={setLastWasCapture}
          level={level}
          emitCommentary={emitCommentary}
        />
      </ScrollView>

      <BottomBar
        room={undefined}
        mySide={mySide === 'white' ? 'w' : 'b'}
        onUndo={async () => {
          const cut = history.length >= 2 ? history.length - 2 : 0; const next = history.slice(0, cut); const newFen = await applySANs(next); setHistory(next); setFen(newFen);
        }}
        onOfferDraw={() => toast('Offer draw not available in AI mode')}
        onResign={async () => { const youAre = mySide === 'white' ? 'w' : 'b'; const result = youAre === 'w' ? '0-1' : '1-0'; await saveAiArchive(history, result as any); }}
        onGoLive={() => {}}
        bottomInset={insets.bottom}
        iconColor={themes[modeName].text as string}
        mode={modeName}
        onFlip={() => setOrientation((o)=> o==='w'?'b':'w')}
        soundsEnabled={settingsVals.sounds}
        toggleSounds={() => settingsVals.setSounds(!settingsVals.sounds)}
        hapticsEnabled={settingsVals.haptics}
        toggleHaptics={() => settingsVals.setHaptics(!settingsVals.haptics)}
        boardTheme={settingsVals.boardTheme}
        onSelectBoardTheme={(t)=> settingsVals.setBoardTheme(t)}
        onOpenSettings={() => router.push('/(tabs)/profile/settings')}
      />
    </Screen>
    </AnimRegistryProvider>
  );
}

// Trigger AI when it's AI's turn
export function AIGameEffects({ fen, mySide, engine, setThinking, setFen, setHistory, thinking, lastHumanMoveRef, play, squareToPixel, setLastFrom, setLastTo, setLastWasCapture, level, emitCommentary }: any) {
  useEffect(() => {
    const turn = sideToMove(fen);
    const aiIs = mySide === 'white' ? 'b' : 'w';
    if (turn !== aiIs) return;

    const delayByLevel = [120, 180, 220, 280, 360, 420, 520, 650];
    const postMoveDelay = [80, 100, 120, 140, 160, 180, 200, 240];
    const idx = Math.max(1, Math.min(8, level || 4)) - 1;
    const preDelay = delayByLevel[idx];
    const postDelay = postMoveDelay[idx];
    setThinking(true);

    const tm = setTimeout(() => {
      const last = lastHumanMoveRef?.current;
      const exclude = last ? [`${last.to}${last.from}`] : [];
      engine
        .bestMove(fen, 300 + idx * 60, exclude)
        .then((m: any) => {
          if (!m || !m.from || !m.to) {
            setThinking(false);
            return;
          }
          const sanPromotion = typeof m.san === 'string' && m.san.includes('=') ? m.san.split('=')[1]?.charAt(0)?.toLowerCase() : undefined;
          const promotion = (m.promotion || sanPromotion) as ('q' | 'r' | 'b' | 'n' | undefined);
          const moveInput: any = { from: m.from, to: m.to };
          if (promotion) moveInput.promotion = promotion;

          setTimeout(() => {
            const result = applyMove(fen, moveInput);
            if (!result.ok) {
              setThinking(false);
              return;
            }
            const pre = fenToBoard(fen).chess;
            const mover = pre.get(m.from as any);
            const victim = pre.get(m.to as any);
            const moverCode = mover ? `${mover.color}${String(mover.type).toUpperCase()}` : 'wP';
            const moverId = `${moverCode}@${m.from}`;
            const captureId = victim ? `${victim.color}${String(victim.type).toUpperCase()}@${m.to}` : undefined;
            const toPixel = squareToPixel(m.to);

            play({
              moverId,
              toPixel,
              captureId,
              onApplyMove: () => {
                setThinking(false);
                setFen(result.fen);
                setHistory((h: string[]) => {
                  const updated = [...h, result.san];
                  emitCommentary?.(fen, result.fen, result.san, updated);
                  const t = detectTerminal('', updated);
                  if (t.over) { saveAiArchive(updated, t.result as any); }
                  return updated;
                });
                setLastFrom(m.from);
                setLastTo(m.to);
                setLastWasCapture(result.san.includes('x'));
                if (lastHumanMoveRef) lastHumanMoveRef.current = null;
              },
            });
          }, postDelay);
        })
        .catch(() => {
          setThinking(false);
        });
    }, preDelay + Math.floor(Math.random() * 120));

    return () => clearTimeout(tm);
  }, [fen, mySide, engine, setFen, setHistory, setThinking, play, squareToPixel, setLastFrom, setLastTo, setLastWasCapture, level, lastHumanMoveRef]);
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

