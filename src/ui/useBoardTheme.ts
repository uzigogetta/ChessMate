import { useSettings } from '@/features/settings/settings.store';
import { useColorScheme } from 'react-native';
import { themes } from './tokens';

export function useBoardTheme() {
  const board = useSettings((s) => s.boardTheme);
  const appTheme = useSettings((s) => s.theme);
  const sys = useColorScheme();
  const mode = appTheme === 'system' ? (sys === 'dark' ? 'dark' : 'light') : appTheme;
  const ui = themes[mode];
  if (board === 'classicGreen') {
    return { light: '#EEEED2', dark: '#769656', pieces: { white: '#ffffff', black: '#0A0A0A' }, highlight: ui.accent };
  }
  if (board === 'native') {
    return mode === 'dark'
      ? { light: '#2D2D30', dark: '#3E3E42', pieces: { white: '#f0f0f0', black: '#111111' }, highlight: ui.accent }
      : { light: '#F2F2F7', dark: '#D1D1D6', pieces: { white: '#1C1C1E', black: '#000000' }, highlight: ui.accent };
  }
  // Default: original non-adaptive brown board
  return { light: '#f0d9b5', dark: '#b58863', pieces: { white: '#ffffff', black: '#111111' }, highlight: ui.accent };
}


