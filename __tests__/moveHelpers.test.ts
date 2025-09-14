import { validateMove, applySANList } from '@/features/chess/logic/moveHelpers';

describe('moveHelpers', () => {
  it('validates legal move and returns SAN and new FEN', () => {
    const r = validateMove(undefined as any as string, 'e2', 'e4');
    expect(r.ok).toBe(true);
    expect(r.san).toBeDefined();
    expect(r.fen).toBeDefined();
  });

  it('rejects illegal move', () => {
    const r = validateMove(undefined as any as string, 'e2', 'e5');
    expect(r.ok).toBe(false);
  });

  it('applies SAN list to reconstruct FEN', () => {
    const fen = applySANList(['e4', 'e5', 'Nf3']);
    expect(typeof fen).toBe('string');
    expect(fen.split(' ')).toHaveLength(6);
  });
});


