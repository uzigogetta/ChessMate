import { Chess, type Square } from 'chess.js';

export type Move = { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' };

export const START_FEN = new Chess().fen();

function normalizeFen(fenOrStart: string): string {
  if (fenOrStart === 'startpos' || !fenOrStart) {
    return START_FEN;
  }
  return fenOrStart;
}

export function newGame(): Chess {
  return new Chess();
}

export function fenToBoard(fenOrStart: string): {
  chess: Chess;
  fen: string;
  turn: 'w' | 'b';
  inCheck: boolean;
} {
  const fen = normalizeFen(fenOrStart);
  const chess = new Chess(fen);
  return { chess, fen, turn: chess.turn(), inCheck: chess.inCheck() };
}

export function legalMovesFrom(fenOrStart: string, square: string): Move[] {
  const { chess } = fenToBoard(fenOrStart);
  const moves = chess.moves({ square: square as Square, verbose: true });
  return moves.map((m: any) => ({ from: m.from, to: m.to, promotion: m.promotion }));
}

export function applyMove(
  fenOrStart: string,
  mv: Move
): { ok: true; fen: string; san: string } | { ok: false; fen: string } {
  const fen = normalizeFen(fenOrStart);
  const chess = new Chess(fen);
  try {
    const res = chess.move({ from: mv.from as Square, to: mv.to as Square, promotion: mv.promotion });
    if (!res) {
      return { ok: false, fen };
    }
    return { ok: true, fen: chess.fen(), san: res.san };
  } catch {
    return { ok: false, fen };
  }
}

export const sideToMove = (fen: string): 'w' | 'b' => fen.split(' ')[1] as 'w' | 'b';

export async function applySANs(sans: string[]): Promise<string> {
  const c = new Chess();
  for (const s of sans) c.move(s, { sloppy: true } as any);
  return c.fen();
}

export function moveToSAN(fen: string, from: string, to: string) {
  const c = new Chess(fen);
  const mv = c.moves({ verbose: true }).find((m: any) => m.from === from && m.to === to);
  if (!mv) return null as null | { san: string; fen: string };
  c.move(mv.san, { sloppy: true } as any);
  return { san: mv.san, fen: c.fen() };
}


