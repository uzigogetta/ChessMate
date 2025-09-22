import { renderHook, act } from '@testing-library/react-hooks';
import { StockfishEngine } from '@/features/chess/engine/stockfish.engine';
import { START_FEN } from '@/features/chess/logic/chess.rules';

jest.setTimeout(15000);

describe('AI flow', () => {
  it('engine responds after a user move', async () => {
    const e = new StockfishEngine({ movetimeMs: 100, skill: 2 });
    await e.init();
    const res = await e.bestMove(START_FEN, 120);
    expect(res.san).toBeTruthy();
  });
});


