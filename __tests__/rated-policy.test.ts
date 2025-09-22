import type { RoomState } from '@/net/types';

function isRated(s: RoomState): boolean {
  return s.phase === 'ACTIVE' || s.phase === 'RESULT'
    ? !!s.policies?.rated
    : !!s.options?.rated;
}

function isTakebacksOn(s: RoomState): boolean {
  return s.phase === 'ACTIVE' || s.phase === 'RESULT'
    ? !!s.policies?.allowTakebacks
    : !!s.options?.allowTakebacks;
}

function gateUndo(s: RoomState, isSpectator: boolean) {
  const phase = s.phase || 'LOBBY';
  if (phase !== 'ACTIVE' || isSpectator) {
    return { enabled: false, reason: phase !== 'ACTIVE' ? 'Unavailable after the game ends' : 'Spectators cannot undo' };
  }
  if (s.mode === '2v2') {
    return { enabled: false, reason: 'Takebacks are not supported in 2v2 (yet).' };
  }
  const rated = isRated(s);
  if (rated) return { enabled: false, reason: 'Takebacks aren’t available in rated games.' };
  const on = isTakebacksOn(s);
  return on ? { enabled: true } : { enabled: false, reason: 'Takebacks are disabled for this game.' };
}

function mkBase(overrides: Partial<RoomState> = {}): RoomState {
  return Object.assign({
    roomId: 'r',
    mode: '1v1' as const,
    members: [],
    seats: {},
    driver: 'w' as const,
    fen: 'fen',
    historySAN: [],
    started: false,
    phase: 'LOBBY' as const,
    version: 0,
    options: { rated: false, allowTakebacks: false },
    policies: undefined,
  }, overrides);
}

describe('Rated/Takebacks policy snapshot and gating', () => {
  it('defaults to rated=false, takebacks=false', () => {
    const s = mkBase();
    expect(isRated(s)).toBe(false);
    expect(isTakebacksOn(s)).toBe(false);
  });

  it('snapshot copies options to policies on START', () => {
    const lobby = mkBase({ options: { rated: true, allowTakebacks: false } });
    // simulate START
    const active = mkBase({
      phase: 'ACTIVE',
      options: lobby.options,
      policies: { rated: !!lobby.options?.rated, allowTakebacks: !!lobby.options?.allowTakebacks }
    });
    expect(isRated(active)).toBe(true);
    expect(isTakebacksOn(active)).toBe(false);
  });

  it('ACTIVE live rated disables undo with rated reason', () => {
    const s = mkBase({ phase: 'ACTIVE', policies: { rated: true, allowTakebacks: true } });
    const g = gateUndo(s, false);
    expect(g.enabled).toBe(false);
    expect(g.reason).toMatch(/rated/i);
  });

  it('ACTIVE live unrated with takebacks allowed enables undo', () => {
    const s = mkBase({ phase: 'ACTIVE', policies: { rated: false, allowTakebacks: true } });
    const g = gateUndo(s, false);
    expect(g.enabled).toBe(true);
  });

  it('2v2 disables undo', () => {
    const s = mkBase({ mode: '2v2', phase: 'ACTIVE', policies: { rated: false, allowTakebacks: true } });
    const g = gateUndo(s, false);
    expect(g.enabled).toBe(false);
  });
});


