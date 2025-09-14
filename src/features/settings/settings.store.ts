import { create } from 'zustand';
import { kv } from '@/features/storage/mmkv';

type Settings = {
  boardTheme: 'default' | 'classicGreen';
  setBoardTheme: (t: 'default' | 'classicGreen') => void;
};

const KEY = 'cm.settings';

function load(): Settings {
  try {
    const raw = kv.getString(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { boardTheme?: 'default' | 'classicGreen' };
      return {
        boardTheme: parsed.boardTheme || 'default',
        setBoardTheme: () => {}
      } as Settings;
    }
  } catch {}
  return { boardTheme: 'default', setBoardTheme: () => {} } as Settings;
}

export const useSettings = create<Settings>((set, get) => ({
  ...load(),
  setBoardTheme(t) {
    set({ boardTheme: t });
    const snapshot = { boardTheme: t };
    kv.set(KEY, JSON.stringify(snapshot));
  }
}));


