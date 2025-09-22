import { create } from 'zustand';

type ReviewState = {
  plyIndex: number;
  pendingLiveCount: number;
  enterReview: (total: number) => void;
  setPlyIndex: (i: number, total: number) => void;
  goLive: (total: number) => void;
  noteLiveIncoming: () => void;
  clearLiveCounter: () => void;
};

export const useReview = create<ReviewState>((set, get) => ({
  plyIndex: 0,
  pendingLiveCount: 0,
  enterReview: (total) => set({ plyIndex: Math.max(0, Math.min(get().plyIndex, total)) }),
  setPlyIndex: (i, total) => set({ plyIndex: Math.max(0, Math.min(i, total)) }),
  goLive: (total) => set({ plyIndex: total, pendingLiveCount: 0 }),
  noteLiveIncoming: () => {
    const { plyIndex } = get();
    // If reviewing (plyIndex < live), increment a small counter to show "Live +N"
    set({ pendingLiveCount: plyIndex >= 0 ? get().pendingLiveCount + 1 : 0 });
  },
  clearLiveCounter: () => set({ pendingLiveCount: 0 }),
}));


