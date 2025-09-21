import type { RoomState } from '@/net/types';

export const makeArchiveKey = (state: RoomState) => {
  const version = typeof state.version === 'number' ? state.version : 'noversion';
  const finished = state.finishedAt ?? state.startedAt ?? 'pending';
  const result = state.result ?? 'unknown';
  return `${state.roomId}:${version}:${finished}:${result}`;
};

export const createArchiveGuard = () => {
  let lastKey: string | undefined;
  return {
    reset() { lastKey = undefined; },
    shouldArchive(state: RoomState) {
      const key = makeArchiveKey(state);
      if (lastKey === key) {
        return false;
      }
      lastKey = key;
      return true;
    },
    mark(state: RoomState) {
      lastKey = makeArchiveKey(state);
    },
  };
};
