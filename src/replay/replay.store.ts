import { create } from 'zustand';

type ReplayState = {
  plyIndex: number;
  setPly: (i: number, total: number) => void;
  next: (total: number) => void;
  prev: () => void;
  start: () => void;
  end: (total: number) => void;
};

export const useReplay = create<ReplayState>((set, get) => ({
  plyIndex: 0,
  setPly: (i, total) => {
    const clamped = Math.max(0, Math.min(i, total));
    set({ plyIndex: clamped });
  },
  next: (total) => {
    const { plyIndex } = get();
    set({ plyIndex: Math.min(plyIndex + 1, total) });
  },
  prev: () => {
    const { plyIndex } = get();
    set({ plyIndex: Math.max(plyIndex - 1, 0) });
  },
  start: () => set({ plyIndex: 0 }),
  end: (total) => set({ plyIndex: Math.max(0, total) }),
}));
