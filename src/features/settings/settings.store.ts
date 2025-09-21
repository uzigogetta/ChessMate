import { create } from 'zustand';
import { getJSON, setJSON, KEYS } from '@/features/storage/mmkv';

type BoardTheme = 'default' | 'classicGreen' | 'native';
type PieceSet = 'default' | 'native';
type ThemeMode = 'system' | 'light' | 'dark';

type SettingsValues = {
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  fullEdgeBoard: boolean;
  cloudArchive: boolean;
  theme: ThemeMode;
  haptics: boolean;
  sounds: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  largeUI: boolean;
};

type Settings = SettingsValues & {
  setBoardTheme: (theme: BoardTheme) => void;
  setPieceSet: (pieceSet: PieceSet) => void;
  setFullEdgeBoard: (value: boolean) => void;
  setCloudArchive: (value: boolean) => void;
  setTheme: (mode: ThemeMode) => void;
  setHaptics: (value: boolean) => void;
  setSounds: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  setLargeUI: (value: boolean) => void;
};

const DEFAULTS: SettingsValues = {
  boardTheme: 'default',
  pieceSet: 'default',
  fullEdgeBoard: false,
  cloudArchive: true,
  theme: 'system',
  haptics: true,
  sounds: true,
  highContrast: false,
  reduceMotion: false,
  largeUI: false,
};

function loadSettings(): SettingsValues {
  const stored = getJSON<Partial<SettingsValues>>(KEYS.settings);
  return { ...DEFAULTS, ...(stored ?? {}) };
}

function pickValues(state: Settings): SettingsValues {
  return {
    boardTheme: state.boardTheme,
    pieceSet: state.pieceSet,
    fullEdgeBoard: state.fullEdgeBoard,
    cloudArchive: state.cloudArchive,
    theme: state.theme,
    haptics: state.haptics,
    sounds: state.sounds,
    highContrast: state.highContrast,
    reduceMotion: state.reduceMotion,
    largeUI: state.largeUI,
  };
}

function persist(values: SettingsValues) {
  setJSON(KEYS.settings, values);
}

export const useSettings = create<Settings>((set) => {
  const apply = (updater: (values: SettingsValues) => SettingsValues) => {
    set((state) => {
      const next = updater(pickValues(state));
      persist(next);
      return next;
    });
  };

  return {
    ...loadSettings(),
    setBoardTheme(theme) {
      apply((values) => ({ ...values, boardTheme: theme }));
    },
    setPieceSet(pieceSet) {
      apply((values) => ({ ...values, pieceSet }));
    },
    setFullEdgeBoard(fullEdgeBoard) {
      apply((values) => ({ ...values, fullEdgeBoard }));
    },
    setCloudArchive(cloudArchive) {
      apply((values) => ({ ...values, cloudArchive }));
    },
    setTheme(theme) {
      apply((values) => ({ ...values, theme }));
    },
    setHaptics(haptics) {
      apply((values) => ({ ...values, haptics }));
    },
    setSounds(sounds) {
      apply((values) => ({ ...values, sounds }));
    },
    setHighContrast(highContrast) {
      apply((values) => ({ ...values, highContrast }));
    },
    setReduceMotion(reduceMotion) {
      apply((values) => ({ ...values, reduceMotion }));
    },
    setLargeUI(largeUI) {
      apply((values) => ({ ...values, largeUI }));
    },
  };
});
