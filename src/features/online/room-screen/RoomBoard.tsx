import React from 'react';
import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { BoardStatusBanner } from '@/features/chess/components/board/BoardStatusBanner';
import type { BoardStatus } from '@/features/chess/components/board/BoardCore';
import { getTurn, validateMove, isLegalMoveForDriver } from '@/features/chess/logic/moveHelpers';
import type { RoomState } from '@/net/types';
import { logMove } from '@/debug/netLogger';
import { useReview } from '@/features/view/review.store';
import { fenFromSAN } from '@/game/fenFromSAN';
import { useMoveResolver } from '@/features/chess/animation/MoveResolver';
import { useAnimRegistry } from '@/features/chess/animation/AnimRegistry';
import { fenToBoard } from '@/features/chess/logic/chess.rules';

export type RoomBoardProps = {
  room: RoomState;
  mySide: 'w' | 'b' | null;
  boardSize: number;
  meId: string;
  moveSAN: (san: string) => void;
  orientation?: 'w' | 'b'; // optional override for local flip
  onStatusChange?: (status: BoardStatus | null) => void;
};

export function RoomBoard({ room, mySide, boardSize, meId, moveSAN, orientation, onStatusChange }: RoomBoardProps) {
  const [flashSquare, setFlashSquare] = React.useState<string | null>(null);
  const [boardStatus, setBoardStatus] = React.useState<BoardStatus | null>(null);
  const shake = React.useRef(new Animated.Value(0)).current;
  const { play, invalid } = useMoveResolver();
  const registry = useAnimRegistry();

  const triggerFlash = React.useCallback((square: string) => {
    setFlashSquare(null);
    requestAnimationFrame(() => setFlashSquare(square));
  }, []);

  const triggerShake = React.useCallback(() => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -6, duration: 40, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -4, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 4, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 40, easing: Easing.linear, useNativeDriver: true })
    ]).start();
  }, [shake]);

  const rejectMove = React.useCallback(
    (square: string) => {
      triggerFlash(square);
      try { invalid(`${square}`); } catch {}
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      triggerShake();
    },
    [triggerFlash, triggerShake, invalid]
  );

  const livePlies = room.historySAN.length;
  const { plyIndex, goLive } = useReview();
  const reviewing = plyIndex < livePlies;
  const movesToRender = reviewing ? room.historySAN.slice(0, plyIndex) : room.historySAN;
  const fen = reviewing ? fenFromSAN(movesToRender) : room.fen;
  const orient = orientation ?? (mySide ?? 'w');
  const squareToPixel = React.useCallback((sq: string) => {
    const file = sq[0];
    const rank = sq[1];
    const col = ('abcdefgh').indexOf(file);
    const row = (8 - parseInt(rank, 10));
    const rr = orient === 'w' ? row : 7 - row;
    const cc = orient === 'w' ? col : 7 - col;
    const cell = boardSize / 8;
    return { x: cc * cell + cell * 0.05, y: rr * cell + cell * 0.05 };
  }, [orient, boardSize]);

  const handleBoardStatus = React.useCallback((next: BoardStatus | null) => {
    setBoardStatus((prev) => {
      if (prev?.key === next?.key) return prev;
      return next ?? null;
    });
  }, []);

  // Authoritative FEN reconciliation: snap all piece animators to server positions
  const prevFenRef = React.useRef<string>(fen);
  React.useEffect(() => {
    if (reviewing) return; // don't reconcile while reviewing
    const prev = prevFenRef.current;
    if (prev === fen) return;
    prevFenRef.current = fen;
    try {
      const { chess } = fenToBoard(fen);
      const grid: any[][] = (chess as any).board?.() || [];
      const idToPos = new Map<string, { x: number; y: number }>();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = grid[r]?.[c];
          if (!p) continue;
          const code = `${p.color}${String(p.type).toUpperCase()}`;
          // Use canonical square ids to match BoardCore/AnimatedPiece ids
          const sqCanonical = `${String.fromCharCode(97 + c)}${8 - r}`;
          const id = `${code}@${sqCanonical}`;
          idToPos.set(id, squareToPixel(sqCanonical));
        }
      }
      registry.forEach((anim) => {
        const pos = idToPos.get(anim.id);
        if (pos) anim.instantTo(pos);
      });
    } catch {}
  }, [fen, orient, boardSize, reviewing, registry, squareToPixel]);

  // Auto-follow live moves when not reviewing
  const prevLiveRef = React.useRef<number>(livePlies);
  React.useEffect(() => {
    const prev = prevLiveRef.current;
    // If we were at or beyond the previous live end (not reviewing), follow the new live
    if (plyIndex >= prev) {
      try { goLive(livePlies); } catch {}
    }
    prevLiveRef.current = livePlies;
  }, [livePlies, plyIndex, goLive]);

  React.useEffect(() => {
    onStatusChange?.(boardStatus);
  }, [boardStatus, onStatusChange]);

  return (
    <>
      <BoardStatusBanner status={boardStatus} style={{ alignSelf: 'center', width: boardSize, marginBottom: 6 }} />
      <Animated.View style={{ transform: [{ translateX: shake }], alignSelf: 'center' }}>
        <BoardSkia
          fen={fen}
          orientation={orient}
          selectableColor={mySide ?? 'w'}
          flashSquare={flashSquare}
          size={boardSize}
          onStatusChange={handleBoardStatus}
          onMoveWithPromotion={(from, to, promo) => {
            const turn = getTurn(fen);
            if (!room.started || !mySide || mySide !== turn || reviewing) { rejectMove(from); return; }
            const result = validateMove(fen, from, to);
            if (!result.ok || !result.san) { rejectMove(from); return; }
            const sanWithPromo = result.san.includes('=') ? result.san : `${result.san}=${String(promo).toUpperCase()}`;
            try {
              const pre = fenToBoard(fen).chess;
              const mover = pre.get(from as any);
              const victim = pre.get(to as any);
              const moverCode = mover ? `${mover.color}${String(mover.type).toUpperCase()}` : 'wP';
              const moverId = `${moverCode}@${from}`;
              const captureId = victim ? `${victim.color}${String(victim.type).toUpperCase()}@${to}` : undefined;
              const toPixel = squareToPixel(to);
              play({ moverId, toPixel, captureId, onApplyMove: () => moveSAN(sanWithPromo) });
            } catch {
              moveSAN(sanWithPromo);
            }
          }}
          onMove={(from, to) => {
            const turn = getTurn(fen);
            if (!room.started || !mySide || mySide !== turn || reviewing) {
              rejectMove(from);
              return;
            }
            const result = validateMove(fen, from, to);
            if (result.ok && result.san) {
              logMove('UI request', { san: result.san, from: mySide, fen: room.fen });
              try {
                const pre = fenToBoard(fen).chess;
                const mover = pre.get(from as any);
                const victim = pre.get(to as any);
                const moverCode = mover ? `${mover.color}${String(mover.type).toUpperCase()}` : 'wP';
                const moverId = `${moverCode}@${from}`;
                const captureId = victim ? `${victim.color}${String(victim.type).toUpperCase()}@${to}` : undefined;
                const toPixel = squareToPixel(to);
                play({ moverId, toPixel, captureId, onApplyMove: () => moveSAN(result.san) });
              } catch {
                moveSAN(result.san);
              }
            } else {
              rejectMove(from);
            }
          }}
          onOptimisticMove={(from, to) => {
            if (reviewing || !isLegalMoveForDriver(room, meId, from, to)) {
              rejectMove(from);
              return;
            }
            const result = validateMove(fen, from, to);
            if (!result.ok || !result.san) {
              rejectMove(from);
              return;
            }
            try {
              const pre = fenToBoard(fen).chess;
              const mover = pre.get(from as any);
              const victim = pre.get(to as any);
              const moverCode = mover ? `${mover.color}${String(mover.type).toUpperCase()}` : 'wP';
              const moverId = `${moverCode}@${from}`;
              const captureId = victim ? `${victim.color}${String(victim.type).toUpperCase()}@${to}` : undefined;
              const toPixel = squareToPixel(to);
              play({ moverId, toPixel, captureId, onApplyMove: () => moveSAN(result.san) });
            } catch {
              moveSAN(result.san);
            }
          }}
        />
      </Animated.View>
    </>
  );
}

