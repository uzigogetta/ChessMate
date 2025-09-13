import { Chess, type Square } from 'chess.js';
import type { AIMove, Engine } from './engine.types';

const MATERIAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export class MockEngine implements Engine {
  async init(): Promise<void> {
    return;
  }

  async bestMove(fen: string, msBudget: number = 350): Promise<AIMove> {
    const chess = new Chess(fen);
    const legal = chess.moves({ verbose: true });
    if (legal.length === 0) {
      return { from: 'a1', to: 'a1', san: '...', fen };
    }
    let bestScore = -Infinity;
    const candidates: any[] = [];
    for (const m of legal) {
      let score = 0;
      if (m.captured) {
        score += MATERIAL[m.captured] ?? 0;
      }
      if (score > bestScore) {
        bestScore = score;
        candidates.length = 0;
        candidates.push(m);
      } else if (score === bestScore) {
        candidates.push(m);
      }
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)] ?? legal[0];
    // apply
    chess.move({ from: pick.from as Square, to: pick.to as Square, promotion: pick.promotion });
    await new Promise((res) => setTimeout(res, 250 + Math.random() * 150));
    return { from: pick.from, to: pick.to, san: pick.san, fen: chess.fen() };
  }
}


