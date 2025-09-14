import React from 'react';
import { Pressable, StyleSheet, Text as RNText, View, ViewProps } from 'react-native';
import { colors, spacing, radii } from './tokens';

type Children = { children?: React.ReactNode };

export function Screen({ children, style, ...rest }: ViewProps & Children) {
  return (
    <View style={[styles.screen, style]} {...rest}>
      {children}
    </View>
  );
}

export function Card({ children, style, ...rest }: ViewProps & Children) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

export function Text({ children, style, muted = false }: { children?: React.ReactNode; style?: any; muted?: boolean }) {
  return <RNText style={[styles.text, muted && { color: colors.muted }, style]}>{children}</RNText>;
}

export function Button({ title, onPress, disabled, style, variant = 'primary' }: { title: string; onPress?: () => void; disabled?: boolean; style?: any; variant?: 'primary' | 'success' }) {
  const bg = variant === 'success' ? '#34C759' : colors.primary; // iOS success green
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg }, disabled && { opacity: 0.8 }, pressed && { opacity: 0.9 }, style]}
    >
      <RNText style={styles.buttonText}>{title}</RNText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    color: colors.text,
    fontSize: 18
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm
  },
  buttonText: {
    color: colors.text,
    fontWeight: '600'
  }
});


