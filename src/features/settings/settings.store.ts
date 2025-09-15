import { create } from 'zustand';
import { kv } from '@/features/storage/mmkv';

type Settings = {
  boardTheme: 'default' | 'classicGreen';
  setBoardTheme: (t: 'default' | 'classicGreen') => void;
  fullEdgeBoard: boolean;
  setFullEdgeBoard: (v: boolean) => void;
  cloudArchive: boolean;
  setCloudArchive: (v: boolean) => void;
};

const KEY = 'cm.settings';

function load(): Settings {
  try {
    const raw = kv.getString(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { boardTheme?: 'default' | 'classicGreen'; fullEdgeBoard?: boolean; cloudArchive?: boolean };
      return {
        boardTheme: parsed.boardTheme || 'default',
        setBoardTheme: () => {},
        fullEdgeBoard: !!parsed.fullEdgeBoard,
        setFullEdgeBoard: () => {},
        cloudArchive: parsed.cloudArchive ?? true,
        setCloudArchive: () => {}
      } as Settings;
    }
  } catch {}
  return { boardTheme: 'default', setBoardTheme: () => {}, fullEdgeBoard: false, setFullEdgeBoard: () => {}, cloudArchive: true, setCloudArchive: () => {} } as Settings;
}

export const useSettings = create<Settings>((set, get) => ({
  ...load(),
  setBoardTheme(t) {
    set({ boardTheme: t });
    const snapshot = { boardTheme: t, fullEdgeBoard: get().fullEdgeBoard, cloudArchive: get().cloudArchive };
    kv.set(KEY, JSON.stringify(snapshot));
  },
  setFullEdgeBoard(v) {
    set({ fullEdgeBoard: v });
    const snapshot = { boardTheme: get().boardTheme, fullEdgeBoard: v, cloudArchive: get().cloudArchive };
    kv.set(KEY, JSON.stringify(snapshot));
  },
  setCloudArchive(v) {
    set({ cloudArchive: v });
    const snapshot = { boardTheme: get().boardTheme, fullEdgeBoard: get().fullEdgeBoard, cloudArchive: v };
    kv.set(KEY, JSON.stringify(snapshot));
  }
}));


