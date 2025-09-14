import { useSettings } from '@/features/settings/settings.store';

export function useBoardTheme() {
  const theme = useSettings((s) => s.boardTheme);
  if (theme === 'classicGreen') {
    return { light: '#EEEED2', dark: '#769656', pieces: { white: '#ffffff', black: '#0A0A0A' } };
  }
  return { light: '#f0d9b5', dark: '#b58863', pieces: { white: '#ffffff', black: '#111111' } };
}


