jest.mock('react-native-mmkv', () => {
  const backing: Record<string, string> = {};
  return {
    MMKV: class {
      set(key: string, value: string) {
        backing[key] = value;
      }
      getString(key: string) {
        return backing[key] ?? null;
      }
    },
  };
});

jest.mock('@/core/identity', () => ({
  getPlayerId: () => 'test-player',
}));

describe('cloud archive smoke test', () => {
  let mockFrom: jest.Mock;
  let mockUpsert: jest.Mock;
  let mockSelect: jest.Mock;
  let mockSingle: jest.Mock;
  let upsertGameCloud: typeof import('@/shared/cloud').upsertGameCloud;
  let isSupabaseConfigured: typeof import('@/shared/supabaseClient').isSupabaseConfigured;

  const loadModules = () => {
    jest.isolateModules(() => {
      ({ upsertGameCloud } = require('@/shared/cloud'));
      ({ isSupabaseConfigured } = require('@/shared/supabaseClient'));
    });
  };

  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    mockSingle = jest.fn(async () => ({ data: { id: 'row-id' }, error: null, status: 200 }));
    mockSelect = jest.fn(() => ({ single: mockSingle }));
    mockUpsert = jest.fn(() => ({ select: mockSelect }));
    mockFrom = jest.fn(() => ({ upsert: mockUpsert }));

    jest.doMock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => ({ from: mockFrom })),
    }));

    loadModules();
  });

  it('upserts game via supabase client', async () => {
    expect(isSupabaseConfigured()).toBe(true);

    const result = await upsertGameCloud(
      {
        id: 'abc',
        createdAt: Date.now(),
        mode: '1v1',
        result: '1-0',
        pgn: 'PGN',
        moves: 3,
        durationMs: 1000,
        whiteName: 'A',
        blackName: 'B',
      } as any,
      'owner',
    );

    expect(result).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('archive_games');
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('treats RLS failures as success', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'violates row-level security policy (USING expression)' },
      status: 401,
    });

    const result = await upsertGameCloud(
      {
        id: 'abc',
        createdAt: Date.now(),
        mode: '1v1',
        result: '1-0',
        pgn: 'PGN',
        moves: 3,
        durationMs: 1000,
        whiteName: 'A',
        blackName: 'B',
      } as any,
      'owner',
    );

    expect(result).toBe(true);
  });
});
