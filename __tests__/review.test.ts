import { useReview } from '@/features/view/review.store';
import { fenFromSAN } from '@/game/fenFromSAN';

describe('Review store', () => {
  it('scrubs plyIndex and go live resets', () => {
    const s = useReview.getState();
    s.setPlyIndex(0, 10);
    expect(useReview.getState().plyIndex).toBe(0);
    s.setPlyIndex(7, 10);
    expect(useReview.getState().plyIndex).toBe(7);
    s.goLive(10);
    expect(useReview.getState().plyIndex).toBe(10);
    expect(useReview.getState().pendingLiveCount).toBe(0);
  });

  it('noteLiveIncoming increments while reviewing', () => {
    const s = useReview.getState();
    s.setPlyIndex(3, 5); // reviewing (< live)
    s.clearLiveCounter();
    s.noteLiveIncoming();
    s.noteLiveIncoming();
    expect(useReview.getState().pendingLiveCount).toBeGreaterThanOrEqual(2);
  });
});

describe('fenFromSAN', () => {
  it('reconstructs FEN deterministically', () => {
    const moves = ['e4','e5','Nf3','Nc6','Bb5'];
    const fen = fenFromSAN(moves);
    expect(typeof fen).toBe('string');
    expect(fen.split(' ').length).toBeGreaterThanOrEqual(4);
  });
});


