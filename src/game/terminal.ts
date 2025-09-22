import { Chess } from 'chess.js';

export type Termination =
  | { over: false }
  | { over: true; result: '1-0' | '0-1' | '1/2-1/2'; reason: 'checkmate' | 'stalemate' | 'fifty-move' | 'threefold' | 'insufficient' };

export function detectTerminal(_fen: string, historySAN: string[]): Termination {
  const game = new Chess();
  game.reset();
  for (const san of historySAN) {
    try {
      game.move(san, { sloppy: true } as any);
    } catch {
      // ignore illegal SANs in history (shouldn't happen, but keep detector resilient)
    }
  }

  if (game.isCheckmate()) {
    // side who just moved delivered mate; game.turn() is the side to move AFTER last move
    const turn = game.turn();
    const result: '1-0' | '0-1' = turn === 'w' ? '0-1' : '1-0';
    return { over: true, result, reason: 'checkmate' };
  }
  if (game.isStalemate()) return { over: true, result: '1/2-1/2', reason: 'stalemate' };
  if ((game as any).isInsufficientMaterial?.() || (game as any).isDraw?.() && (game as any).isInsufficientMaterial?.()) {
    // prefer explicit insufficient
    return { over: true, result: '1/2-1/2', reason: 'insufficient' };
  }
  if ((game as any).isThreefoldRepetition?.()) return { over: true, result: '1/2-1/2', reason: 'threefold' };
  const hm = typeof (game as any).getHalfmoves === 'function' ? (game as any).getHalfmoves() : (game as any).halfmoves?.() ?? 0;
  if (hm >= 100) return { over: true, result: '1/2-1/2', reason: 'fifty-move' };
  return { over: false };
}


