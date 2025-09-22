import { StockfishEngine } from '@/features/chess/engine/stockfish.engine';

jest.setTimeout(10000);

describe('StockfishEngine', () => {
  it('returns a bestmove quickly', async () => {
    const e = new StockfishEngine({ movetimeMs: 100, skill: 2 });
    await e.init();
    const res = await e.bestMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 120);
    expect(res.from).toHaveLength(2);
    expect(res.to).toHaveLength(2);
  });
});


