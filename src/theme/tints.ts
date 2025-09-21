import { Platform, DynamicColorIOS, PlatformColor } from 'react-native';

const DC = (light: string, dark: string) => {
  if (Platform.OS === 'ios') {
    return DynamicColorIOS({ light, dark }) as unknown as string;
  }
  if (Platform.OS === 'android') {
    return PlatformColor('?attr/colorSurface') as unknown as string;
  }
  return light;
};

export const chip = {
  neutralBg: DC('#EFEFF4', '#1C1C1E'),
  infoBg: DC('#E5F0FF', '#0B2847'),
  successBg: DC('#E9F9EF', '#0E2B1A'),
  dangerBg: DC('#FFE9E9', '#3A0C0C'),
  text: ((): string => {
    if (Platform.OS === 'ios') return PlatformColor('label') as unknown as string;
    if (Platform.OS === 'android') return PlatformColor('?attr/colorOnSurface') as unknown as string;
    return '#111111';
  })(),
};

export type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

// High-contrast tones (used when High Contrast is enabled)
export const chipHC = {
  // For dark HC (black bg) we render selected fills with saturated accents and black text; unselected stay black with white text
  dark: {
    neutralBg: '#000000',
    infoBg: '#00FFFF',
    successBg: '#00FF00',
    warningBg: '#FFFF00',
    dangerBg: '#FF0000',
    textOnFill: '#000000',
    textOnBase: '#FFFFFF',
    border: '#FFFFFF',
  },
  // For light HC (white bg) we use black/blue accents with white or black text for max contrast
  light: {
    neutralBg: '#FFFFFF',
    infoBg: '#0000FF',
    successBg: '#007F00',
    warningBg: '#B8860B',
    dangerBg: '#8B0000',
    textOnFill: '#FFFFFF',
    textOnBase: '#000000',
    border: '#000000',
  },
};


