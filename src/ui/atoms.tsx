import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View, ViewProps, useColorScheme } from 'react-native';
import { themes, spacing, radii, ThemeName } from './tokens';
import { useSettings } from '@/features/settings/settings.store';
import { colors } from '@/theme/colors';
import { chip as chipTints } from '@/theme/tints';

type Children = { children?: React.ReactNode };

export function Screen({ children, style, ...rest }: ViewProps & Children) {
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];
  return (
    <View style={[{ flex: 1, backgroundColor: c.background, padding: spacing.lg }, style]} {...rest}>
      {children}
    </View>
  );
}

export function Card({ children, style, system = false, ...rest }: ViewProps & Children & { system?: boolean }) {
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const hybrid = useSettings((s) => s.hybridSurfaces);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];
  const useSystem = system || (hybrid && active === 'light' && sys === 'dark');
  const bg = useSystem ? colors.bg2 : (c as any).card;
  return (
    <View style={[{ backgroundColor: bg, borderRadius: radii.md, padding: spacing.xl, alignItems: 'center', justifyContent: 'center' }, style]} {...rest}>
      {children}
    </View>
  );
}

export function Text({ children, style, muted = false }: { children?: React.ReactNode; style?: any; muted?: boolean }) {
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];
  return <RNText style={[{ color: c.text, fontSize: 18 }, muted && { color: c.muted }, style]}>{children}</RNText>;
}

export function Button({ title, onPress, disabled, style, variant = 'primary' }: { title: string; onPress?: () => void; disabled?: boolean; style?: any; variant?: 'primary' | 'success' }) {
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];
  const bg = variant === 'success' ? '#34C759' : (c as any).primary;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [{ marginTop: spacing.lg, backgroundColor: bg, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.sm }, disabled && { opacity: 0.8 }, pressed && { opacity: 0.9 }, style]}
    >
      <RNText style={{ color: (c as any).text, fontWeight: '600' }}>{title}</RNText>
    </Pressable>
  );
}

export function Separator({ style }: { style?: any }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }, style]} />;
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
  tone?: 'neutral' | 'info' | 'success' | 'danger';
}) {
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];
  const highContrast = useSettings((s) => s.highContrast);
  const largeUI = useSettings((s) => s.largeUI);
  const bgMap: Record<string, string> = {
    neutral: chipTints.neutralBg as string,
    info: chipTints.infoBg as string,
    success: chipTints.successBg as string,
    danger: chipTints.dangerBg as string,
  };
  const backgroundColor = selected ? (c as any).primary : (bgMap[tone] || chipTints.neutralBg);
  const textColor = selected ? '#FFFFFF' : (chipTints.text as string);
  const borderColor = selected ? 'transparent' : (active === 'dark' ? '#3A3A3C' : '#E5E5EA');
  const pv = largeUI ? 8 : 6;
  return (
    <Pressable onPress={onPress} style={[{ borderRadius: 999 }, style]}> 
      <View style={{ paddingHorizontal: 12, paddingVertical: pv, borderRadius: 999, backgroundColor, borderWidth: highContrast ? 2 : 1, borderColor }}>
        <RNText style={{ color: textColor, fontSize: largeUI ? 15 : 13 }}>{label}</RNText>
      </View>
    </Pressable>
  );
}


