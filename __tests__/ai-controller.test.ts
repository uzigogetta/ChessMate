import { renderHook, act } from '@testing-library/react-hooks';
import { START_FEN } from '@/features/chess/logic/chess.rules';
import { StockfishEngine } from '@/features/chess/engine/stockfish.engine';

const mockWorker = {
  postMessage: jest.fn(),
  onmessage: null as null | ((msg: any) => void),
};

jest.mock('@/features/chess/engine/stockfishBrowser', () => ({
  createBrowserStockfish: async () => () => mockWorker,
}));

describe('AI flow', () => {
  it('engine responds after a user move', async () => {
    const engine = new StockfishEngine({ movetimeMs: 100, skill: 2 });
    await engine.init();

    const movePromise = engine.bestMove(START_FEN, 120);

    // Simulate search info and bestmove
    mockWorker.onmessage?.('info depth 10 score cp 15 pv e2e4 e7e5');
    mockWorker.onmessage?.('bestmove e2e4');

    const result = await movePromise;
    expect(result.san).toBeTruthy();
  });
});


