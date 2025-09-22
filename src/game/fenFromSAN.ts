import { Chess } from 'chess.js';

export function fenFromSAN(moves: string[]): string {
  const c = new Chess();
  c.reset();
  for (const san of moves) {
    try { c.move(san, { sloppy: true } as any); } catch {}
  }
  return c.fen();
}


