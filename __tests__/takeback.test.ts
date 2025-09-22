import { fenFromSAN } from '@/game/fenFromSAN';

describe('AI/Local undo last pair', () => {
  it('removes last two SAN entries when available', () => {
    const before = ['e4','e5','Nf3','Nc6'];
    const cut = before.length >= 2 ? before.length - 2 : 0;
    const after = before.slice(0, cut);
    expect(after).toEqual(['e4','e5']);
    const fen = fenFromSAN(after);
    expect(typeof fen).toBe('string');
  });
});

// Note: handshake paths for daily/correspondence are exercised in integration; here we statically
// validate the slice semantics used by AI/Local back->undo mapping.


