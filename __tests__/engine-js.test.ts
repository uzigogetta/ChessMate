import { parseInfo } from '@/features/chess/engine/stockfish.engine';

describe('Stockfish parseInfo', () => {
  it('parses cp info lines', () => {
    const line = 'info depth 12 seldepth 18 multipv 1 score cp 68 nodes 12345 nps 512000 pv e2e4 e7e5 g1f3';
    expect(parseInfo(line)).toEqual({
      depth: 12,
      nodes: 12345,
      cp: 68,
      mate: undefined,
      multipv: 1,
      bound: undefined,
      pvUci: ['e2e4', 'e7e5', 'g1f3'],
    });
  });

  it('parses mate info lines', () => {
    const line = 'info depth 18 score mate -3 nodes 500000 pv h7h8q g8h7';
    expect(parseInfo(line)).toEqual({
      depth: 18,
      nodes: 500000,
      cp: undefined,
      mate: -3,
      multipv: undefined,
      bound: undefined,
      pvUci: ['h7h8q', 'g8h7'],
    });
  });
});


