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

export type ChipTone = 'neutral' | 'info' | 'success' | 'danger';


