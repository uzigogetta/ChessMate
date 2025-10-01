import { Chess, type Square } from 'chess.js';
import type { AIMove, Engine, EngineInitOptions } from './engine.types';

const MATERIAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export class MockEngine implements Engine {
  private listeners: Array<(line: string) => void> = [];
  private ready = false;

  private emit(line: string) {
    for (const listener of this.listeners) {
      try {
        listener(line);
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.warn('[mock-engine] listener error', err);
        }
      }
    }
  }

  async init(_: EngineInitOptions = {}): Promise<void> {
    if (this.ready) {
      this.emit('readyok');
      return;
    }
    this.emit('id name MockEngine');
    this.emit('id author ChessMate');
    this.emit('uciok');
    this.emit('readyok');
    this.ready = true;
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
    const pick = candidates[Math.floor(Math.random() * Math.max(1, candidates.length))] ?? legal[0];
    // apply
    chess.move({ from: pick.from as Square, to: pick.to as Square, promotion: pick.promotion });
    const delay = Math.min(msBudget, 250 + Math.random() * 150);
    await new Promise((res) => setTimeout(res, delay));
    const result = { from: pick.from, to: pick.to, san: pick.san, fen: chess.fen() };
    this.emit(`bestmove ${pick.from}${pick.to}${pick.promotion ?? ''}`);
    return result;
  }

  send(command: string): void {
    const normalized = command.trim().toLowerCase();
    if (normalized === 'uci') {
      this.emit('uciok');
    } else if (normalized === 'isready') {
      this.emit('readyok');
    } else if (normalized === 'ucinewgame') {
      // no-op
    } else if (normalized.startsWith('position')) {
      // ignore for mock
    } else if (normalized.startsWith('go')) {
      // ignore, bestMove handles generation in JS
    }
  }

  onMessage(handler: (line: string) => void): void {
    this.listeners.push(handler);
  }

  dispose(): void {
    this.listeners = [];
    this.ready = false;
  }
}


