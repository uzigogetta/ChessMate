import { Platform, DynamicColorIOS } from 'react-native';

// Returns a platform-safe dynamic color:
// - iOS: DynamicColorIOS(light/dark)
// - Others: resolves to light or dark based on provided theme
export function dynamicColor(light: string, dark: string, theme: 'light' | 'dark') {
  if (Platform.OS === 'ios') {
    return DynamicColorIOS({ light, dark }) as unknown as string;
  }
  return theme === 'dark' ? dark : light;
}


