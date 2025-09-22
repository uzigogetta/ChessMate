import { Platform, PlatformColor } from 'react-native';
import type { ColorValue } from 'react-native';

// Safe helper to access Android Material/One UI attributes without crashing on devices
// that don't expose the attribute. Falls back to the provided color.
export function androidColor(attr: string, fallback: ColorValue): ColorValue {
  if (Platform.OS !== 'android') return fallback;
  try {
    // Some OEM skins (or older Android versions) may not have Material 3 attrs.
    // PlatformColor will throw if attr is invalid in development, so guard it.
    return PlatformColor(attr) as unknown as ColorValue;
  } catch (_e) {
    return fallback;
  }
}

export const AndroidPalette = {
  surface: (fallback: ColorValue) => androidColor('?attr/colorSurface', fallback),
  onSurface: (fallback: ColorValue) => androidColor('?attr/colorOnSurface', fallback),
  primary: (fallback: ColorValue) => androidColor('?attr/colorPrimary', fallback),
  onPrimary: (fallback: ColorValue) => androidColor('?attr/colorOnPrimary', fallback),
  outline: (fallback: ColorValue) => androidColor('?attr/colorOutline', fallback),
  surfaceVariant: (fallback: ColorValue) => androidColor('?attr/colorSurfaceVariant', fallback),
  surfaceContainerHigh: (fallback: ColorValue) => androidColor('?attr/colorSurfaceContainerHigh', fallback),
  ripple: (fallback: ColorValue) => androidColor('?attr/colorControlHighlight', fallback),
};


