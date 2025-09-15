import { init, insertGame, listGames, getGame } from '@/archive/db';

describe('archive db', () => {
  it('init and insert/list/get', async () => {
    await init();
    const row = {
      id: 'test-id',
      createdAt: Date.now(),
      mode: '1v1',
      result: '1-0',
      pgn: '[Result "1-0"]\n\n1. e4 1-0',
      moves: 1,
      durationMs: 1234,
      whiteName: 'Alice',
      blackName: 'Bob'
    } as any;
    await insertGame(row);
    const list = await listGames(10, 0);
    expect(Array.isArray(list)).toBe(true);
    const got = await getGame('test-id');
    expect(got?.id).toBe('test-id');
  });
});


