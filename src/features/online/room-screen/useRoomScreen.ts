import { useCallback, useMemo } from 'react';
import { useRoomStore } from '@/features/online/room.store';
import { getTurn } from '@/features/chess/logic/moveHelpers';
import type { RoomState, Seat } from '@/net/types';

export type RoomDerivedState = {
  room?: RoomState;
  meId: string;
  mySeats: Seat[];
  mySide: 'w' | 'b' | null;
  isHost: boolean;
  readyToStart: boolean;
  isMyTurn: boolean;
  isMinimal: boolean;
  nameById: (id?: string) => string;
};

export function useRoomScreenState(): RoomDerivedState {
  const room = useRoomStore((s) => s.room);
  const meId = useRoomStore((s) => s.me.id);
  const members = room?.members ?? [];
  const seats = room?.seats ?? {};

  const mySeats = useMemo(() => {
    if (!room) return [] as Seat[];
    return (Object.keys(seats) as Seat[]).filter((seat) => seats[seat] === meId);
  }, [room, seats, meId]);

  const mySide = useMemo<'w' | 'b' | null>(() => {
    if (!room) return null;
    if (mySeats.some((seat) => seat.startsWith('w'))) return 'w';
    if (mySeats.some((seat) => seat.startsWith('b'))) return 'b';
    return null;
  }, [room, mySeats]);

  const readyToStart = useMemo(() => {
    if (!room) return false;
    if (room.mode === '1v1') {
      return !!seats['w1'] && !!seats['b1'];
    }
    const hasW = !!seats['w1'] || !!seats['w2'];
    const hasB = !!seats['b1'] || !!seats['b2'];
    return hasW && hasB;
  }, [room, seats]);

  const isHost = useMemo(() => {
    if (!room || members.length === 0) return false;
    const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id));
    return sorted[0]?.id === meId;
  }, [room, members, meId]);

  const isMyTurn = useMemo(() => {
    if (!room || !room.started || !mySide) return false;
    return mySide === getTurn(room.fen);
  }, [room, mySide]);

  const isMinimal = room?.mode === '1v1';

  const nameById = useCallback(
    (id?: string) => members.find((player) => player.id === id)?.name ?? '—',
    [members]
  );

  return {
    room,
    meId,
    mySeats,
    mySide,
    isHost,
    readyToStart,
    isMyTurn,
    isMinimal,
    nameById,
  };
}
