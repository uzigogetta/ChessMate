import { Chess, type Square } from 'chess.js';
import type { RoomState, Seat } from '@/net/types';

export function validateMove(
  fen: string,
  from: string,
  to: string
): { ok: boolean; san?: string; fen?: string; reason?: string } {
  try {
    const chess = new Chess(fen);
    const verbose = chess.moves({ square: from as Square, verbose: true }) as any[];
    const mv = verbose.find((m) => m.from === from && m.to === to);
    if (!mv) return { ok: false, reason: 'illegal' };
    const res = chess.move(mv.san, { sloppy: true } as any);
    if (!res) return { ok: false, reason: 'illegal' };
    return { ok: true, san: res.san, fen: chess.fen() };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'error' };
  }
}

export function applySANList(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s, { sloppy: true } as any);
  return c.fen();
}

export function isLegalMoveForDriver(
  room: RoomState,
  playerId: string,
  from: string,
  to: string
): boolean {
  if (!room.started) return false;
  const c = new Chess(room.fen);
  // Ensure it's the driver's turn
  if (c.turn() !== room.driver) return false;
  // Player must occupy at least one seat on the driver side
  const mySeats = (Object.keys(room.seats) as Seat[]).filter((k) => room.seats[k] === playerId);
  if (mySeats.length === 0) return false;
  const canDrive = mySeats.some((s) => s.startsWith(room.driver));
  if (!canDrive) return false;
  // Ensure the selected piece color matches the driver side
  const piece = c.get(from as any);
  if (!piece || piece.color !== room.driver) return false;
  // Finally ensure the move itself is legal
  const res = validateMove(room.fen, from, to);
  return !!res.ok;
}


