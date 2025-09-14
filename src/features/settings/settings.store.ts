import { create } from 'zustand';
import { kv } from '@/features/storage/mmkv';

type Settings = {
  boardTheme: 'default' | 'classicGreen';
  setBoardTheme: (t: 'default' | 'classicGreen') => void;
  fullEdgeBoard: boolean;
  setFullEdgeBoard: (v: boolean) => void;
};

const KEY = 'cm.settings';

function load(): Settings {
  try {
    const raw = kv.getString(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { boardTheme?: 'default' | 'classicGreen'; fullEdgeBoard?: boolean };
      return {
        boardTheme: parsed.boardTheme || 'default',
        setBoardTheme: () => {},
        fullEdgeBoard: !!parsed.fullEdgeBoard,
        setFullEdgeBoard: () => {}
      } as Settings;
    }
  } catch {}
  return { boardTheme: 'default', setBoardTheme: () => {}, fullEdgeBoard: false, setFullEdgeBoard: () => {} } as Settings;
}

export const useSettings = create<Settings>((set, get) => ({
  ...load(),
  setBoardTheme(t) {
    set({ boardTheme: t });
    const snapshot = { boardTheme: t, fullEdgeBoard: get().fullEdgeBoard };
    kv.set(KEY, JSON.stringify(snapshot));
  },
  setFullEdgeBoard(v) {
    set({ fullEdgeBoard: v });
    const snapshot = { boardTheme: get().boardTheme, fullEdgeBoard: v };
    kv.set(KEY, JSON.stringify(snapshot));
  }
}));


