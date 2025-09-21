import { ColorValue } from 'react-native';

export type ThemeName = 'light' | 'dark';

type Palette = { background: ColorValue; card: ColorValue; text: ColorValue; muted: ColorValue; primary: ColorValue; accent: ColorValue };

// Static palettes so app-level theme overrides (light/dark) are respected regardless of OS setting
export const themes: Record<ThemeName, Palette> = {
	light: {
		background: '#FFFFFF',
		card: '#F2F2F7',
		text: '#1C1C1E',
		muted: '#636366',
		primary: '#0A84FF',
		accent: '#30D158'
	},
	dark: {
		background: '#0B0B0D',
		card: '#121217',
		text: '#F2F2F7',
		muted: '#8E8E93',
		primary: '#7C5CFF',
		accent: '#00E0B8'
	}
};

// High-contrast palettes tuned per mode to maximize readability
const highContrastDark: Palette = {
  background: '#000000',
  card: '#000000',
  text: '#FFFFFF',
  muted: '#FFFFFF',
  primary: '#1AEBFF', // Windows HC hyperlink blue as primary action
  accent: '#00FF00', // lime for success accents
};

const highContrastLight: Palette = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  text: '#000000',
  muted: '#000000',
  primary: '#000000', // black for primary fills
  accent: '#0000FF', // blue for info/links
};

export function getTheme(active: ThemeName, opts?: { highContrast?: boolean }): Palette {
  if (opts?.highContrast) return active === 'dark' ? highContrastDark : highContrastLight;
  return themes[active];
}

export const spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24
};

export const radii = {
	sm: 8,
	md: 12,
	lg: 20
};


