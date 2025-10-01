import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View, ViewProps, useColorScheme } from 'react-native';
import { themes, spacing, radii, ThemeName, getTheme } from './tokens';
import { useSettings } from '@/features/settings/settings.store';
import { colors } from '@/theme/colors';
import { chip as chipTints, chipHC } from '@/theme/tints';

type Children = { children?: React.ReactNode };

export function Screen({ children, style, ...rest }: ViewProps & Children) {
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const highContrast = useSettings((s) => s.highContrast);
  const largeUI = useSettings((s) => s.largeUI);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = getTheme(active, { highContrast });
  return (
    <View style={[{ flex: 1, backgroundColor: c.background, padding: largeUI ? spacing.xl : spacing.lg }, style]} {...rest}>
      {children}
    </View>
  );
}

export function Card({ children, style, system = false, ...rest }: ViewProps & Children & { system?: boolean }) {
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const highContrast = useSettings((s) => s.highContrast);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = getTheme(active, { highContrast });
  const bg = (c as any).card;
  return (
    <View style={[{ backgroundColor: bg, borderRadius: radii.md, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', borderWidth: highContrast ? 2 : 0, borderColor: active === 'dark' ? '#FFFFFF' : '#000000' }, style]} {...rest}>
      {children}
    </View>
  );
}

export function Text({ children, style, muted = false }: { children?: React.ReactNode; style?: any; muted?: boolean }) {
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const highContrast = useSettings((s) => s.highContrast);
  const largeUI = useSettings((s) => s.largeUI);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = getTheme(active, { highContrast });
  return <RNText style={[{ color: c.text, fontSize: largeUI ? 20 : 18 }, highContrast && { fontWeight: '700' }, muted && { color: c.muted }, style]}>{children}</RNText>;
}

export function Button({ title, onPress, disabled, style, variant = 'primary' }: { title: string; onPress?: () => void; disabled?: boolean; style?: any; variant?: 'primary' | 'success' | 'ghost' }) {
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const highContrast = useSettings((s) => s.highContrast);
  const largeUI = useSettings((s) => s.largeUI);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = getTheme(active, { highContrast });
  
  const bg = variant === 'ghost' 
    ? 'transparent'
    : variant === 'success'
    ? (highContrast ? (active === 'dark' ? '#00FF00' : '#007F00') : '#34C759')
    : (c as any).primary;
    
  const labelColor = variant === 'ghost'
    ? (c as any).primary
    : highContrast ? (active === 'dark' ? '#000000' : '#FFFFFF') : '#FFFFFF';
    
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        { 
          marginTop: spacing.lg, 
          backgroundColor: bg, 
          paddingVertical: largeUI ? spacing.md : spacing.sm, 
          paddingHorizontal: largeUI ? spacing.xl : spacing.lg, 
          borderRadius: radii.sm, 
          borderWidth: highContrast || variant === 'ghost' ? 2 : 0, 
          borderColor: variant === 'ghost' ? (c as any).primary : (active === 'dark' ? '#FFFFFF' : '#000000')
        }, 
        disabled && { opacity: 0.4 }, 
        pressed && { opacity: 0.7 }, 
        style
      ]}
    >
      <RNText style={{ color: labelColor, fontWeight: highContrast ? '800' : '600', fontSize: largeUI ? 18 : 16 }}>{title}</RNText>
    </Pressable>
  );
}

export function Separator({ style }: { style?: any }) {
  const highContrast = useSettings((s) => s.highContrast);
  return <View style={[{ height: highContrast ? 2 : StyleSheet.hairlineWidth, backgroundColor: colors.separator }, style]} />;
}

const styles = StyleSheet.create({});

export function Chip({
  label,
  selected,
  onPress,
  style,
  tone = 'neutral'
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: any;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}) {
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const highContrast = useSettings((s) => s.highContrast);
  const c = getTheme(active, { highContrast });
  const largeUI = useSettings((s) => s.largeUI);
  const bgMap: Record<string, string> = {
    neutral: chipTints.neutralBg as string,
    info: chipTints.infoBg as string,
    success: chipTints.successBg as string,
    warning: '#FFF8E1',
    danger: chipTints.dangerBg as string,
  };
  // High contrast per-tone handling
  let backgroundColor: string;
  let textColor: string;
  let borderColor: string;

  if (highContrast) {
    const hc = active === 'dark' ? chipHC.dark : chipHC.light;
    if (selected) {
      backgroundColor = tone === 'info' ? hc.infoBg : tone === 'success' ? hc.successBg : tone === 'warning' ? hc.warningBg : tone === 'danger' ? hc.dangerBg : (active === 'dark' ? '#FFFFFF' : '#000000');
      textColor = hc.textOnFill;
      borderColor = hc.border;
    } else {
      backgroundColor = hc.neutralBg;
      textColor = hc.textOnBase;
      borderColor = hc.border;
    }
  } else {
    backgroundColor = selected ? (c as any).primary : (bgMap[tone] || chipTints.neutralBg);
    textColor = selected ? '#FFFFFF' : (chipTints.text as string);
    borderColor = selected ? 'transparent' : (active === 'dark' ? '#3A3A3C' : '#E5E5EA');
  }
  const pv = largeUI ? 8 : 6;
  return (
    <Pressable onPress={onPress} style={[{ borderRadius: 999 }, style]}> 
      <View style={{ paddingHorizontal: 12, paddingVertical: pv, borderRadius: 999, backgroundColor, borderWidth: highContrast ? 2 : 1, borderColor }}>
        <RNText style={{ color: textColor, fontSize: largeUI ? 15 : 13, fontWeight: highContrast ? '700' : '500' }}>{label}</RNText>
      </View>
    </Pressable>
  );
}

export function Badge({ children, tone = 'neutral', style }: { children?: React.ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'; style?: any }) {
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const highContrast = useSettings((s) => s.highContrast);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = getTheme(active, { highContrast });

  const palette: Record<string, { bg: string; text: string }> = {
    neutral: { bg: highContrast ? (active === 'dark' ? '#FFFFFF' : '#000000') : 'rgba(148, 163, 184, 0.18)', text: c.text },
    accent: { bg: highContrast ? '#FFD60A' : (c as any).primary, text: highContrast ? '#000000' : '#FFFFFF' },
    success: { bg: highContrast ? '#00FF9D' : '#16a34a', text: highContrast ? '#000000' : '#F8FAFC' },
    warning: { bg: highContrast ? '#FFB800' : '#FBBF24', text: highContrast ? '#000000' : '#111827' },
    danger: { bg: highContrast ? '#FF375F' : '#EF4444', text: '#FFFFFF' },
  };
  const colours = palette[tone] ?? palette.neutral;

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: colours.bg,
          borderWidth: highContrast ? 2 : 0,
          borderColor: highContrast ? (active === 'dark' ? '#000000' : '#FFFFFF') : 'transparent',
        },
        style,
      ]}
    >
      <RNText style={{ color: colours.text, fontSize: 12, fontWeight: highContrast ? '800' : '600' }}>{children}</RNText>
    </View>
  );
}


