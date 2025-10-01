import { create } from 'zustand';
import { getJSON, setJSON, KEYS } from '@/features/storage/mmkv';

export type EngineMode = 'auto' | 'native' | 'browser';

export type EngineSettings = {
  mode: EngineMode;
  threads: number;
  hashMB: number;
  skill: number;
  multipv: number;
  moveOverheadMs: number;
};

type EngineSettingsState = EngineSettings & {
  setMode: (mode: EngineMode) => void;
  setThreads: (threads: number) => void;
  setHashMB: (hash: number) => void;
  setSkill: (skill: number) => void;
  setMultipv: (multipv: number) => void;
  setMoveOverheadMs: (value: number) => void;
  reset: () => void;
};

const DEFAULTS: EngineSettings = {
  mode: 'auto',
  threads: 2,
  hashMB: 64,
  skill: 20,
  multipv: 1,
  moveOverheadMs: 30,
};

const STORAGE_KEY = KEYS.engineSettings ?? 'cm.settings.engine';

function loadEngineSettings(): EngineSettings {
  const stored = getJSON<Partial<EngineSettings>>(STORAGE_KEY);
  return { ...DEFAULTS, ...(stored ?? {}) };
}

function persist(settings: EngineSettings) {
  setJSON(STORAGE_KEY, settings);
}

export const useEngineSettings = create<EngineSettingsState>((set) => {
  const apply = (updater: (current: EngineSettings) => EngineSettings) => {
    set((state) => {
      const current: EngineSettings = {
        mode: state.mode,
        threads: state.threads,
        hashMB: state.hashMB,
        skill: state.skill,
        multipv: state.multipv,
        moveOverheadMs: state.moveOverheadMs,
      };
      const next = updater(current);
      persist(next);
      return next;
    });
  };

  return {
    ...loadEngineSettings(),
    setMode(mode) {
      apply((current) => ({ ...current, mode }));
    },
    setThreads(threads) {
      apply((current) => ({ ...current, threads }));
    },
    setHashMB(hashMB) {
      apply((current) => ({ ...current, hashMB }));
    },
    setSkill(skill) {
      const clamped = Math.max(0, Math.min(20, skill));
      apply((current) => ({ ...current, skill: clamped }));
    },
    setMultipv(multipv) {
      const clamped = Math.max(1, Math.min(5, multipv));
      apply((current) => ({ ...current, multipv: clamped }));
    },
    setMoveOverheadMs(moveOverheadMs) {
      const clamped = Math.max(0, Math.min(200, moveOverheadMs));
      apply((current) => ({ ...current, moveOverheadMs: clamped }));
    },
    reset() {
      apply(() => DEFAULTS);
    },
  };
});

