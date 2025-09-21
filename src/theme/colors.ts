import { Platform, PlatformColor } from 'react-native';

type Palette = {
	bg: any;
	bg2: any;
	text: any;
	text2: any;
	separator: any;
	primary: any;
	accent: any;
};

const ios: Palette = {
	bg: PlatformColor('systemBackground'),
	bg2: PlatformColor('secondarySystemBackground'),
	text: PlatformColor('label'),
	text2: PlatformColor('secondaryLabel'),
	separator: PlatformColor('separator'),
	primary: PlatformColor('systemBlue'),
	accent: PlatformColor('systemPurple')
};

// Use safe static fallbacks on Android to avoid crashes on devices missing Material 3 attrs
const android: Palette = {
    bg: '#FFFFFF',
    bg2: '#F2F2F7',
    text: '#111111',
    text2: '#6B7280',
    separator: '#E5E7EB',
    primary: '#0A84FF',
    accent: '#6C5CE7'
};

const fallback: Palette = {
	bg: '#FFFFFF',
	bg2: '#F2F2F7',
	text: '#111111',
	text2: '#6B7280',
	separator: '#E5E7EB',
	primary: '#0A84FF',
	accent: '#6C5CE7'
};

export const colors: Palette = Platform.select({ ios, android, default: fallback }) as Palette;

// Custom dynamic chip background when no direct system token is ideal
export const chipBg = Platform.OS === 'ios' ? '#EFEFF4' : '#F2F2F7';


