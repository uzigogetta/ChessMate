import React from 'react';
import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { getTurn, validateMove, isLegalMoveForDriver } from '@/features/chess/logic/moveHelpers';
import type { RoomState } from '@/net/types';
import { logMove } from '@/debug/netLogger';
import { useReview } from '@/features/view/review.store';
import { fenFromSAN } from '@/game/fenFromSAN';

export type RoomBoardProps = {
  room: RoomState;
  mySide: 'w' | 'b' | null;
  boardSize: number;
  meId: string;
  moveSAN: (san: string) => void;
  orientation?: 'w' | 'b'; // optional override for local flip
};

export function RoomBoard({ room, mySide, boardSize, meId, moveSAN, orientation }: RoomBoardProps) {
  const [flashSquare, setFlashSquare] = React.useState<string | null>(null);
  const shake = React.useRef(new Animated.Value(0)).current;

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      triggerShake();
    },
    [triggerFlash, triggerShake]
  );

  const livePlies = room.historySAN.length;
  const { plyIndex, goLive } = useReview();
  const reviewing = plyIndex < livePlies;
  const movesToRender = reviewing ? room.historySAN.slice(0, plyIndex) : room.historySAN;
  const fen = reviewing ? fenFromSAN(movesToRender) : room.fen;

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

  return (
    <Animated.View style={{ transform: [{ translateX: shake }], alignSelf: 'center' }}>
      <BoardSkia
        fen={fen}
        orientation={orientation ?? (mySide ?? 'w')}
        selectableColor={mySide ?? 'w'}
        flashSquare={flashSquare}
        size={boardSize}
        onMove={(from, to) => {
          const turn = getTurn(fen);
          if (!room.started || !mySide || mySide !== turn || reviewing) {
            rejectMove(from);
            return;
          }
          const result = validateMove(fen, from, to);
          if (result.ok && result.san) {
            logMove('UI request', { san: result.san, from: mySide, fen: room.fen });
            moveSAN(result.san);
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
          moveSAN(result.san);
        }}
      />
    </Animated.View>
  );
}
