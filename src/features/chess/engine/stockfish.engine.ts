import type { AIMove, Engine } from './engine.types';
import { Chess } from 'chess.js';
// Lazy-resolve stockfish at runtime to avoid Metro import during iOS cold start
let STOCKFISH_FACTORY: any | null = null;
async function loadStockfish() {
  if (STOCKFISH_FACTORY) return STOCKFISH_FACTORY;
  try {
    const mod = await import('stockfish');
    STOCKFISH_FACTORY = (mod as any).default || (mod as any);
  } catch (e) {
    throw new Error('Stockfish module not found');
  }
  return STOCKFISH_FACTORY;
}

type EngineOptions = {
  skill?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  movetimeMs?: number;
  depth?: number;
};

export class StockfishEngine implements Engine {
  private worker: any | null = null;
  private readyPromise: Promise<void> | null = null;
  private options: EngineOptions;

  constructor(options: EngineOptions = {}) {
    this.options = options;
  }

  async init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    const factory = await loadStockfish();
    this.worker = factory();
    const skill = Math.max(1, Math.min(12, this.options.skill ?? 4));
    // Map 1..12 → SF Skill (0..20). Levels 9..12 use max 20
    const skillMap = [0, 3, 6, 9, 12, 15, 18, 20, 20, 20, 20, 20];
    // Approximate Elo caps for 1..11 (Lv12 = full strength, no cap)
    const eloMap = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2550, 2700];
    const errMap = [500, 350, 250, 180, 120, 60, 20, 0, 0, 0, 0];
    const probMap = [100, 90, 75, 60, 40, 25, 10, 0, 0, 0, 0];
    this.readyPromise = new Promise<void>((resolve) => {
      if (!this.worker) return resolve();
      const w = this.worker;
      let gotUci = false;
      let gotReady = false;
      const handler = (msg: any) => {
        const line: string = typeof msg === 'string' ? msg : (msg?.data ?? '');
        if (typeof line !== 'string') return;
        if (!gotUci && (line.includes('uciok') || line.startsWith('id ') || line.startsWith('option '))) {
          gotUci = true;
        }
        if (line.includes('readyok')) {
          gotReady = true;
          w.onmessage = null;
          resolve();
        }
      };
      w.onmessage = handler;
      w.postMessage('uci');
      // Core options
      try { w.postMessage('setoption name Threads value 1'); } catch {}
      try { w.postMessage(`setoption name Hash value ${skill >= 11 ? 64 : 16}`); } catch {}
      try { w.postMessage('setoption name MultiPV value 1'); } catch {}
      try { w.postMessage('setoption name Ponder value false'); } catch {}
      // Strength controls
      try { w.postMessage(`setoption name Skill Level value ${skillMap[skill - 1]}`); } catch {}
      if (skill >= 12) {
        // Super‑GM: full strength
        try { w.postMessage('setoption name UCI_LimitStrength value false'); } catch {}
      } else {
        try { w.postMessage('setoption name UCI_LimitStrength value true'); } catch {}
        try { w.postMessage(`setoption name UCI_Elo value ${eloMap[Math.min(eloMap.length - 1, skill - 1)]}`); } catch {}
        try { w.postMessage(`setoption name Skill Level Maximum Error value ${errMap[Math.min(errMap.length - 1, skill - 1)]}`); } catch {}
        try { w.postMessage(`setoption name Skill Level Probability value ${probMap[Math.min(probMap.length - 1, skill - 1)]}`); } catch {}
      }
      w.postMessage('isready');
      // Failsafe resolve in case engine is noisy but misses readyok
      setTimeout(() => { if (!gotReady) { try { w.onmessage = null; } catch {} ; resolve(); } }, 400);
    });
    return this.readyPromise;
  }

  async bestMove(
    fen: string,
    msBudget: number = (this.options.movetimeMs ?? 300),
    excludeUci: string[] = []
  ): Promise<AIMove> {
    try {
      await this.init();
      const worker = this.worker;
      if (!worker) throw new Error('Engine not initialized');
      return await new Promise<AIMove>((resolve) => {
        const thinkPerSkill = [200, 250, 300, 350, 450, 550, 650, 750, 850, 1000, 1200, 1400];
        const skill = Math.max(1, Math.min(12, this.options.skill ?? 4));
        const useDepth = skill >= 12 ? (this.options.depth ?? 20) : undefined;
        const think = Math.max(30, msBudget ?? thinkPerSkill[skill - 1]);
        const timeout = setTimeout(() => {
          try { worker.postMessage('stop'); } catch {}
          // Fallback: play first legal move to avoid hanging
          const c = new Chess(fen);
          const legal: any[] = c.moves({ verbose: true });
          const mv = legal[Math.floor(Math.random() * Math.max(1, legal.length))];
          if (mv) {
            c.move(mv.san, { sloppy: true } as any);
            resolve({ from: mv.from, to: mv.to, san: mv.san, fen: c.fen() });
          } else {
            // No legal moves; return current FEN with a null-like move (flag ok upstream)
            resolve({ from: 'a1', to: 'a2', san: '...', fen });
          }
        }, (useDepth ? 8000 : think + 1500));

        const handle = (msg: any) => {
          const line: string = typeof msg === 'string' ? msg : (msg?.data ?? '');
          if (typeof line !== 'string') return;
          if (line.startsWith('bestmove ')) {
            try { clearTimeout(timeout); } catch {}
            worker.onmessage = null;
            const tokens = line.split(' ');
            const uci = tokens[1] || '';
            const from = uci.slice(0, 2);
            const to = uci.slice(2, 4);
            const promo = uci.slice(4);
            const chess = new Chess(fen);
            try {
              const res = chess.move({ from, to, promotion: promo as any }, { sloppy: true } as any);
              const nextFen = chess.fen();
              resolve({ from, to, san: res?.san ?? '...', fen: nextFen });
            } catch {
              resolve({ from, to, san: '...', fen });
            }
          }
        };
        worker.onmessage = handle;
        // start search immediately; init already performed readiness
        worker.postMessage('ucinewgame');
        worker.postMessage(`position fen ${fen}`);
        const c = new Chess(fen);
        const legal: any[] = c.moves({ verbose: true });
        const legalUci: string[] = legal.map((m) => `${m.from}${m.to}${m.promotion ? m.promotion : ''}`);
        const excludeSet = new Set(excludeUci);
        let allowed = legalUci.filter((u) => !excludeSet.has(u));
        if (allowed.length === 0) allowed = legalUci;
        const searchMovesArg = allowed.length > 0 ? ` searchmoves ${allowed.join(' ')}` : '';
        if (useDepth) worker.postMessage(`go depth ${useDepth}${searchMovesArg}`);
        else if (this.options.depth) worker.postMessage(`go depth ${this.options.depth}${searchMovesArg}`);
        else worker.postMessage(`go movetime ${think}${searchMovesArg}`);
      });
    } catch {
      // Absolute fallback: random legal
      const c = new Chess(fen);
      const legal: any[] = c.moves({ verbose: true });
      const mv = legal[0];
      if (mv) {
        c.move(mv.san, { sloppy: true } as any);
        return { from: mv.from, to: mv.to, san: mv.san, fen: c.fen() };
      }
      return { from: 'a1', to: 'a1', san: '...', fen };
    }
  }

  stop(): void {
    try { this.worker?.postMessage('stop'); } catch {}
  }
}


