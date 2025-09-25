import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { useWindowDimensions, ScrollView } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { BoardStatusBanner } from '@/features/chess/components/board/BoardStatusBanner';
import type { BoardStatus } from '@/features/chess/components/board/BoardCore';
import { START_FEN, applyMove, fenToBoard, applySANs } from '@/features/chess/logic/chess.rules';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, useColorScheme } from 'react-native';
import { BottomBar } from '@/features/game/BottomBar';
import { themes } from '@/ui/tokens';
import { useRouter } from 'expo-router';
import { SND } from '../../assets/snd';
import { AnimRegistryProvider } from '@/features/chess/animation/AnimRegistry';
import { useMoveResolver } from '@/features/chess/animation/MoveResolver';
import { CommentaryStrip, createCommentarySession } from '@/features/commentary';

const LOCAL_PERSONA = {
  name: 'Coach Nova',
  title: 'Your Tactical Companion',
  fallback: '🎯',
  gradient: ['rgba(191,90,242,0.34)', 'rgba(31,31,35,0.6)'],
};

export default function LocalGameScreen() {
  const [fen, setFen] = useState(START_FEN);
  const [history, setHistory] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<'w'|'b'>('w');
  const [lastFromSq, setLastFromSq] = useState<string | null>(null);
  const [lastToSq, setLastToSq] = useState<string | null>(null);
  const [lastWasCapture, setLastWasCapture] = useState<boolean>(false);
  const [boardStatus, setBoardStatus] = useState<BoardStatus | null>(null);
  const turn = useMemo(() => fenToBoard(fen).turn, [fen]);
  const { width } = useWindowDimensions();
  const fullEdge = useSettings((s) => s.fullEdgeBoard);
  const containerPad = fullEdge ? 0 : 12;
  const boardSize = Math.floor(width - (fullEdge ? 0 : 24));
  const insets = useSafeAreaInsets();
  const sys = useColorScheme();
  const router = useRouter();
  const settingsVals = useSettings();
  const modeName = (settingsVals.theme === 'system' ? (sys === 'dark' ? 'dark' : 'light') : settingsVals.theme) as 'light'|'dark';
  const BAR_HEIGHT = 64;
  const bottomPad = Math.max(insets.bottom, 12) + BAR_HEIGHT + 16;
  const { play, invalid } = useMoveResolver();
  const commentarySessionRef = React.useRef(createCommentarySession({ mode: 'local', playerName: 'You', opponentName: 'Opponent' }));
  const [commentaryRoomId, setCommentaryRoomId] = useState(commentarySessionRef.current.getRoomId());
  const historyRef = React.useRef<string[]>(history);
  const fenRef = React.useRef<string>(fen);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  useEffect(() => {
    commentarySessionRef.current.updateMeta({
      playerName: orientation === 'w' ? 'White' : 'Black',
      opponentName: orientation === 'w' ? 'Black' : 'White',
    });
    setCommentaryRoomId(commentarySessionRef.current.getRoomId());
  }, [orientation]);

  const emitCommentary = useCallback((prevFen: string, nextFen: string, san: string, historySAN: string[]) => {
    const moverColor = fenToBoard(prevFen).turn;
    const moverRole = moverColor === orientation ? 'player' : 'opponent';
    commentarySessionRef.current.emitMove({
      prevFen,
      nextFen,
      moveSan: san,
      mover: moverRole,
      color: moverColor,
      historySAN,
    });
  }, [orientation]);

  const squareToPixel = React.useCallback((sq: string) => {
    const file = sq[0];
    const rank = sq[1];
    const col = ('abcdefgh').indexOf(file);
    const row = (8 - parseInt(rank, 10));
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
  React.useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <AnimRegistryProvider>
    <Screen style={{ paddingTop: 0, paddingHorizontal: containerPad }}>
      <Stack.Screen options={{ headerTitle: 'Local Game' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, alignItems: 'center', justifyContent: 'flex-start', gap: 12, paddingBottom: bottomPad }}>
        <Card>
          <Text>{`Local — Turn: ${turn === 'w' ? 'White' : 'Black'}`}</Text>
        </Card>
        <BoardStatusBanner status={boardStatus} style={{ paddingHorizontal: fullEdge ? 0 : 12 }} />
        <CommentaryStrip roomId={commentaryRoomId} persona={LOCAL_PERSONA} style={{ width: boardSize, alignSelf: 'center' }} />
        <BoardSkia
          onStatusChange={handleBoardStatus}
          fen={fen}
          size={boardSize}
          moveIndex={history.length}
          orientation={orientation}
          lastFrom={lastFromSq as any}
          lastTo={lastToSq as any}
          lastWasCapture={lastWasCapture}
          onMoveWithPromotion={(from, to, promo) => {
            const r = applyMove(fen, { from, to, promotion: promo as any });
            if (!r.ok) { invalid(`${from}`); return; }
            try {
              const pre = fenToBoard(fen).chess;
              const mover = pre.get(from as any);
              const victim = pre.get(to as any);
              const moverCode = mover ? `${mover.color}${String(mover.type).toUpperCase()}` : 'wP';
              const moverId = `${moverCode}@${from}`;
              const captureId = victim ? `${victim.color}${String(victim.type).toUpperCase()}@${to}` : undefined;
              const toPixel = squareToPixel(to);
              play({
                moverId,
                toPixel,
                captureId,
                onApplyMove: () => {
                  const prevFen = fenRef.current;
                  const nextHistory = [...historyRef.current, r.san];
                  setFen(r.fen);
                  setHistory(nextHistory);
                  historyRef.current = nextHistory;
                  fenRef.current = r.fen;
                  setLastFromSq(from);
                  setLastToSq(to);
                  setLastWasCapture(r.san.includes('x'));
                  emitCommentary(prevFen, r.fen, r.san, nextHistory);
                },
              });
            } catch {
              const prevFen = fenRef.current;
              const nextHistory = [...historyRef.current, r.san];
              setFen(r.fen);
              setHistory(nextHistory);
              historyRef.current = nextHistory;
              fenRef.current = r.fen;
              setLastFromSq(from);
              setLastToSq(to);
              setLastWasCapture(r.san.includes('x'));
              emitCommentary(prevFen, r.fen, r.san, nextHistory);
            }
          }}
          onMove={(from, to) => {
            const r = applyMove(fen, { from, to });
            if (!r.ok) { invalid(`${from}`); return; }
            try {
              const pre = fenToBoard(fen).chess;
              const mover = pre.get(from as any);
              const victim = pre.get(to as any);
              const moverCode = mover ? `${mover.color}${String(mover.type).toUpperCase()}` : 'wP';
              const moverId = `${moverCode}@${from}`;
              const captureId = victim ? `${victim.color}${String(victim.type).toUpperCase()}@${to}` : undefined;
              const toPixel = squareToPixel(to);
              play({
                moverId,
                toPixel,
                captureId,
                onApplyMove: () => {
                  const prevFen = fenRef.current;
                  const nextHistory = [...historyRef.current, r.san];
                  setFen(r.fen);
                  setHistory(nextHistory);
                  historyRef.current = nextHistory;
                  fenRef.current = r.fen;
                  setLastFromSq(from);
                  setLastToSq(to);
                  setLastWasCapture(r.san.includes('x'));
                  emitCommentary(prevFen, r.fen, r.san, nextHistory);
                },
              });
            } catch {
              const prevFen = fenRef.current;
              const nextHistory = [...historyRef.current, r.san];
              setFen(r.fen);
              setHistory(nextHistory);
              historyRef.current = nextHistory;
              fenRef.current = r.fen;
              setLastFromSq(from);
              setLastToSq(to);
              setLastWasCapture(r.san.includes('x'));
              emitCommentary(prevFen, r.fen, r.san, nextHistory);
            }
          }}
        />
        <Button title="Undo" onPress={async () => {
          const cut = history.length >= 1 ? history.length - 1 : 0;
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
      </ScrollView>

      <BottomBar
        room={undefined}
        mySide={null}
        onUndo={async () => { const cut = history.length >= 2 ? history.length - 2 : 0; const next = history.slice(0, cut); const newFen = await applySANs(next); setHistory(next); setFen(newFen); }}
        onOfferDraw={() => { /* local mode: no-op */ }}
        onResign={() => { /* local mode: no-op */ }}
        onGoLive={() => {}}
        bottomInset={insets.bottom}
        iconColor={themes[modeName].text as string}
        mode={modeName as any}
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

