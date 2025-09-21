import { createArchiveGuard, makeArchiveKey } from '@/features/online/archiveGuard';
import type { RoomState } from '@/net/types';

describe('archiveGuard', () => {
  const base: RoomState = {
    roomId: 'room',
    mode: '1v1',
    members: [],
    seats: {},
    driver: 'w',
    fen: 'start',
    historySAN: [],
    started: true,
  };

  it('produces stable keys', () => {
    expect(makeArchiveKey({ ...base, result: '1-0', version: 1, finishedAt: 100 })).toBe('room:1:100:1-0');
    expect(makeArchiveKey({ ...base, result: '1/2-1/2', finishedAt: undefined, startedAt: 200 })).toBe('room:noversion:200:1/2-1/2');
  });

  it('guards duplicate finalize payloads', () => {
    const guard = createArchiveGuard();
    const state = { ...base, result: '1-0', finishedAt: 123 } as RoomState;

    expect(guard.shouldArchive(state)).toBe(true);
    expect(guard.shouldArchive(state)).toBe(false);

    const nextState = { ...state, finishedAt: 456 };
    expect(guard.shouldArchive(nextState)).toBe(true);
  });
});
