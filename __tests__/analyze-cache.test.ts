const mockEval = jest.fn();

jest.mock('@/features/chess/engine/stockfish.engine', () => {
  const actual = jest.requireActual('@/features/chess/engine/stockfish.engine');
  return {
    ...actual,
    createStockfish: () => ({
      evalPosition: mockEval,
    }),
  };
});

jest.mock('@/replay/cache', () => {
  const store = new Map<string, any>();
  return {
    getEval: (gameId: string, ply: number) => store.get(`${gameId}:${ply}`) ?? null,
    setEval: (gameId: string, ply: number, value: any) => store.set(`${gameId}:${ply}`, value),
  };
});

import { analyzeFen, evaluatePosition } from '@/replay/analyze';

describe('analyzeFen cache integration', () => {
  beforeEach(() => {
    mockEval.mockReset();
  });

  it('runs engine on first call and caches', async () => {
    mockEval.mockResolvedValue({ cp: 18, pv: ['e4', 'e5'], mate: undefined });
    const result = await analyzeFen({ gameId: 'g1', ply: 4, fen: 'startpos', signal: undefined });
    expect(result).toEqual({ cp: 18, pv: ['e4', 'e5'], mate: undefined });
    expect(mockEval).toHaveBeenCalledTimes(1);
  });

  it('returns cached value on subsequent call', async () => {
    mockEval.mockResolvedValue({ cp: 0, pv: [], mate: undefined });
    await analyzeFen({ gameId: 'g2', ply: 2, fen: 'startpos', signal: undefined });
    expect(mockEval).toHaveBeenCalledTimes(1);
    mockEval.mockReset();
    const second = await analyzeFen({ gameId: 'g2', ply: 2, fen: 'startpos', signal: undefined });
    expect(second).toEqual({ cp: 0, pv: [], mate: undefined });
    expect(mockEval).not.toHaveBeenCalled();
  });
});
