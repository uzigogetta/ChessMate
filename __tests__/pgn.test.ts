import { buildPGN } from '@/archive/pgn';

describe('pgn', () => {
  it('builds simple PGN', () => {
    const pgn = buildPGN({ whiteName: 'Alice', blackName: 'Bob', result: '1-0', movesSAN: ['e4', 'e5', 'Nf3', 'Nc6'] });
    expect(pgn).toContain('[White "Alice"]');
    expect(pgn).toContain('[Black "Bob"]');
    expect(pgn).toContain('1. e4 e5 2. Nf3 Nc6 1-0');
  });
});


