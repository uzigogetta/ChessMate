import type { AIMove, Engine, EngineInitOptions } from './engine.types';
import { Chess } from 'chess.js';
import { createBrowserStockfish } from './stockfishBrowser';
// Lazy-resolve stockfish at runtime to avoid Metro import during iOS cold start
let STOCKFISH_FACTORY: any | null = null;

async function loadStockfish() {
  if (STOCKFISH_FACTORY) return STOCKFISH_FACTORY;
  STOCKFISH_FACTORY = await createBrowserStockfish();
  return STOCKFISH_FACTORY;
}

type EngineOptions = {
  skill?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  movetimeMs?: number;
  depth?: number;
};

export type ParsedInfo = {
  depth?: number;
  nodes?: number;
  cp?: number;
  mate?: number;
  pvUci?: string[];
  multipv?: number;
  bound?: 'lower' | 'upper';
};

export type EvalPositionOptions = {
  budgetMs?: number;
  signal?: AbortSignal;
  perspective?: 'white' | 'black';
  onInfo?: (info: ParsedInfo & { pvSan?: string[] }) => void;
};

export type EvalPositionResult = {
  cp?: number;
  mate?: number;
  pv: string[];
};

export function parseInfo(line: string): ParsedInfo | null {
  if (!line || !line.startsWith('info')) return null;
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 2) return null;
  let cp: number | undefined;
  let mate: number | undefined;
  let depth: number | undefined;
  let nodes: number | undefined;
  let pvUci: string[] | undefined;
  let multipv: number | undefined;
  let bound: 'lower' | 'upper' | undefined;
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    switch (token) {
      case 'depth': {
        const next = tokens[i + 1];
        if (next) {
          const parsed = Number(next);
          if (!Number.isNaN(parsed)) depth = parsed;
          i += 1;
        }
        break;
      }
      case 'nodes': {
        const next = tokens[i + 1];
        if (next) {
          const parsed = Number(next);
          if (!Number.isNaN(parsed)) nodes = parsed;
          i += 1;
        }
        break;
      }
      case 'score': {
        const type = tokens[i + 1];
        const raw = tokens[i + 2];
        if (type && raw) {
          const value = Number(raw);
          if (!Number.isNaN(value)) {
            if (type === 'cp') {
              cp = value;
            } else if (type === 'mate') {
              mate = value;
            }
          }
        }
        i += 2;
        break;
      }
      case 'pv': {
        pvUci = tokens.slice(i + 1);
        i = tokens.length; // terminate loop
        break;
      }
      case 'multipv': {
        const next = tokens[i + 1];
        if (next) {
          const parsed = Number(next);
          if (!Number.isNaN(parsed)) multipv = parsed;
          i += 1;
        }
        break;
      }
      case 'upperbound':
        bound = 'upper';
        break;
      case 'lowerbound':
        bound = 'lower';
        break;
      default:
        break;
    }
  }
  return { cp, mate, depth, nodes, pvUci, multipv, bound };
}

function pvToSan(fen: string, pvUci: string[] | undefined): string[] {
  if (!pvUci || pvUci.length === 0) return [];
  const chess = new Chess();
  try { chess.load(fen); } catch {
    return [];
  }
  const san: string[] = [];
  for (const uci of pvUci) {
    if (!uci || uci.length < 4) break;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci.slice(4) || undefined;
    try {
      const res = chess.move({ from, to, promotion: promo as any }, { sloppy: true } as any);
      if (!res?.san) break;
      san.push(res.san);
    } catch {
      break;
    }
  }
  return san;
}

export class StockfishEngine implements Engine {
  private worker: any | null = null;
  private readyPromise: Promise<void> | null = null;
  private options: EngineOptions;
  private initOptions: EngineInitOptions = {};
  private listeners: Array<(line: string) => void> = [];
  private onceListeners: Array<{ id: number; handler: (line: string) => boolean }> = [];
  private onceCounter = 0;

  constructor(options: EngineOptions = {}) {
    this.options = options;
  }

  async init(opts?: EngineInitOptions): Promise<void> {
    if (opts) {
      this.initOptions = { ...this.initOptions, ...opts };
    }

    if (this.readyPromise) {
      if (this.worker) {
        this.applyUciOptions(this.worker);
      }
      return this.readyPromise;
    }
    const factory = await loadStockfish();
    this.worker = await factory();
    if (!this.worker || typeof this.worker.postMessage !== 'function') {
      throw new Error('Stockfish worker unavailable');
    }
    this.attachMessagePump(this.worker);
    this.readyPromise = new Promise<void>((resolve) => {
      if (!this.worker) return resolve();
      const readyCleanup = this.addOnceListener((line) => {
        if (line.includes('readyok')) {
          resolve();
          return true;
        }
        return false;
      });
      const timeout = setTimeout(() => {
        readyCleanup();
        resolve();
      }, 800);
      this.worker.postMessage('uci');
      this.applyUciOptions(this.worker, { includeDefaults: true });
      this.worker.postMessage('isready');
      this.addOnceListener((line) => {
        if (line.includes('readyok')) {
          clearTimeout(timeout);
          return true;
        }
        return false;
      });
    });
    return this.readyPromise;
  }

  private applyUciOptions(worker: any, options: { includeDefaults?: boolean } = {}) {
    const { includeDefaults = false } = options;
    if (!worker) return;

    const sendOption = (name: string, value: string | number | boolean | undefined) => {
      if (value === undefined || value === null) return;
      try {
        worker.postMessage(`setoption name ${name} value ${value}`);
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.warn(`[stockfish] failed to set option ${name}`, err);
        }
      }
    };

    const init = this.initOptions ?? {};

    const personaSkill = Math.max(1, Math.min(12, this.options.skill ?? 4));
    // Map persona level 1..12 → UCI Skill Level 0..20 (higher levels share max strength)
    const personaSkillMap = [0, 3, 6, 9, 12, 15, 18, 20, 20, 20, 20, 20];
    const resolvedSkill = Math.max(0, Math.min(20, init.skill ?? personaSkillMap[personaSkill - 1]));

    if (includeDefaults) {
      sendOption('Threads', init.threads ?? 1);
      sendOption('Hash', init.hashMB ?? 64);
      sendOption('MultiPV', init.multipv ?? 1);
      sendOption('Ponder', false);
    } else {
      sendOption('Threads', init.threads);
      sendOption('Hash', init.hashMB);
      sendOption('MultiPV', init.multipv);
    }

    sendOption('Skill Level', resolvedSkill);
    if (init.moveOverheadMs !== undefined) {
      sendOption('Move Overhead', init.moveOverheadMs);
    }

    const uciOptions = init.uciOptions ?? {};
    for (const [name, value] of Object.entries(uciOptions)) {
      sendOption(name, value);
    }
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

        const removeListener = this.addOnceListener((line) => {
          if (!line.startsWith('bestmove ')) return false;
          try { clearTimeout(timeout); } catch {}
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
          return true;
        });
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
        this.addOnceListener((line) => {
          if (line.startsWith('bestmove ')) {
            removeListener();
            return true;
          }
          return false;
        });
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

  dispose(): void {
    try { this.worker?.terminate?.(); } catch {}
    try {
      this.listeners = [];
      this.onceListeners = [];
    } catch {}
    this.worker = null;
    this.readyPromise = null;
    this.initOptions = {};
    this.onceCounter = 0;
  }

  send(command: string): void {
    try {
      this.worker?.postMessage(command);
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.warn('[stockfish] failed to send command', command, err);
      }
    }
  }

  onMessage(handler: (line: string) => void): void {
    this.listeners.push(handler);
  }

  dispose(): void {
    try { this.worker?.terminate?.(); } catch {}
    this.worker = null;
    this.readyPromise = null;
    this.initOptions = {};
    this.listeners = [];
    this.onceListeners = [];
    this.onceCounter = 0;
  }

  private attachMessagePump(worker: any) {
    if (!worker) return;
    worker.onmessage = (msg: any) => {
      const line: string = typeof msg === 'string' ? msg : (msg?.data ?? '');
      if (typeof line !== 'string') return;

      const remaining: typeof this.onceListeners = [];
      for (const entry of this.onceListeners) {
        let handled = false;
        try {
          handled = entry.handler(line);
        } catch (error) {
          if (typeof console !== 'undefined') {
            console.warn('[stockfish] once listener error', error);
          }
        }
        if (!handled) {
          remaining.push(entry);
        }
      }
      this.onceListeners = remaining;

      for (const listener of this.listeners) {
        try {
          listener(line);
        } catch (error) {
          if (typeof console !== 'undefined') {
            console.warn('[stockfish] listener error', error);
          }
        }
      }
    };
  }

  private addOnceListener(handler: (line: string) => boolean): () => void {
    const id = this.onceCounter++;
    this.onceListeners.push({ id, handler });
    return () => {
      this.onceListeners = this.onceListeners.filter((entry) => entry.id !== id);
    };
  }

  async evalPosition(fen: string, budgetMs?: number, options: EvalPositionOptions = {}): Promise<EvalPositionResult> {
    await this.init();
    const worker = this.worker;
    if (!worker) throw new Error('Engine not initialized');
    const perspective = options.perspective ?? 'white';
    const searchMs = Math.max(80, Math.min(400, budgetMs ?? this.options.movetimeMs ?? 240));
    const chess = new Chess();
    try { chess.load(fen); } catch {}

    let best: ParsedInfo | null = null;
    let resolved = false;

    const finalize = (payload: ParsedInfo | null) => {
      if (resolved) return;
      resolved = true;
      try { worker.onmessage = null; } catch {}
      try { worker.postMessage('stop'); } catch {}
      options.signal?.removeEventListener('abort', abort);
      clearTimeout(timer);
      const info = payload ?? {};
      const pvSan = pvToSan(fen, info.pvUci);
      const cpRaw = info.cp;
      const cpNormalized = typeof cpRaw === 'number' ? (perspective === 'white' ? cpRaw : -cpRaw) : undefined;
      resolve({ cp: cpNormalized, mate: info.mate, pv: pvSan });
    };

    const abort = () => {
      finalize(best);
    };

    options.signal?.addEventListener('abort', abort, { once: true });

    return await new Promise<EvalPositionResult>((resolve) => {
      const timer = setTimeout(() => finalize(best), searchMs + 80);
      const handle = (msg: any) => {
        const line: string = typeof msg === 'string' ? msg : (msg?.data ?? '');
        if (typeof line !== 'string' || line.length === 0) return;
        if (line.startsWith('info ')) {
          const parsed = parseInfo(line);
          if (parsed) {
            if (parsed.bound) return; // skip upper/lower bounds
            if (typeof parsed.multipv === 'number' && parsed.multipv > 1) return; // main PV only
            best = {
              ...best,
              ...parsed,
              pvUci: parsed.pvUci?.length ? parsed.pvUci : best?.pvUci,
            };
            const pvSan = pvToSan(fen, best?.pvUci);
            const cpRaw = best?.cp;
            const cpNormalized = typeof cpRaw === 'number' ? (perspective === 'white' ? cpRaw : -cpRaw) : undefined;
            options.onInfo?.({ ...best, pvSan, cp: cpNormalized });
          }
        } else if (line.startsWith('bestmove ')) {
          finalize(best);
        }
      };
      worker.onmessage = handle;
      try { worker.postMessage('stop'); } catch {}
      worker.postMessage('ucinewgame');
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go movetime ${searchMs}`);
    });
  }
}

export function createStockfish(options?: EngineOptions) {
  return new StockfishEngine(options);
}


