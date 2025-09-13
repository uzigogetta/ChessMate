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
  const res = chess.move({ from: mv.from as Square, to: mv.to as Square, promotion: mv.promotion });
  if (!res) {
    return { ok: false, fen };
  }
  return { ok: true, fen: chess.fen(), san: res.san };
}


