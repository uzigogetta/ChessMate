import { createStockfish, EvalPositionResult, StockfishEngine } from '@/features/chess/engine/stockfish.engine';
import { getEval, setEval } from './cache';

let engine: StockfishEngine | null = null;

export function ensureEvalEngine() {
  if (!engine) {
    engine = createStockfish({ skill: 9, movetimeMs: 240 });
  }
  return engine;
}

type AnalyzeOptions = {
  fen: string;
  gameId: string;
  ply: number;
  budgetMs?: number;
  signal?: AbortSignal;
};

export async function evaluatePosition({ fen, signal, budgetMs }: AnalyzeOptions): Promise<EvalPositionResult> {
  try {
    const instance = ensureEvalEngine();
    const perspective = fen.includes(' w ') ? 'white' : 'black';
    return await instance.evalPosition(fen, budgetMs, { signal, perspective });
  } catch (error) {
    console.error('[analyze] evaluation failed', error);
    throw error;
  }
}

export async function analyzeFen(opts: AnalyzeOptions): Promise<EvalPositionResult> {
  const cached = getEval(opts.gameId, opts.ply);
  if (cached) {
    return {
      cp: cached.cp,
      mate: cached.mate,
      pv: cached.pv ?? [],
    };
  }

  const result = await evaluatePosition(opts);
  const entry = {
    cp: result.cp,
    mate: result.mate,
    pv: result.pv ?? [],
  };
  setEval(opts.gameId, opts.ply, entry);
  return result;
}

export function disposeEvalEngine() {
  try {
    engine?.dispose();
  } catch {}
  engine = null;
}
