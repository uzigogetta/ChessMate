import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export type EvalBarProps = {
  cp?: number;
  mate?: number;
  perspective?: 'white' | 'black';
  highContrast?: boolean;
};

const WHITE_COLOR = '#2ECC71';
const BLACK_COLOR = '#FF5A5F';
const TRACK_COLOR = 'rgba(255,255,255,0.16)';

export function formatEvalLabel(cp?: number, mate?: number) {
  if (typeof mate === 'number') {
    const prefix = mate > 0 ? '+' : mate < 0 ? '-' : '';
    return `${prefix}M${Math.abs(mate)}`;
  }
  if (typeof cp === 'number') {
    const score = cp / 100;
    const abs = Math.abs(score);
    const formatted = abs < 10 ? abs.toFixed(1) : Math.round(abs).toString();
    const prefix = score > 0 ? '+' : score < 0 ? '-' : '';
    return score === 0 ? '0.0' : `${prefix}${formatted}`;
  }
  return '—';
}

export function computeChunkFractions(cp?: number, mate?: number) {
  if (typeof mate === 'number') {
    if (mate === 0) return { white: 0.5, black: 0.5 };
    return mate > 0 ? { white: 0.96, black: 0.04 } : { white: 0.04, black: 0.96 };
  }
  if (typeof cp === 'number') {
    const clamped = Math.max(-300, Math.min(300, cp));
    const ratio = 0.5 + clamped / 600;
    const white = Math.max(0.05, Math.min(0.95, ratio));
    return { white, black: 1 - white };
  }
  return { white: 0.5, black: 0.5 };
}

export function EvalBar({ cp, mate, perspective = 'white', highContrast }: EvalBarProps) {
  const normalizedCp = React.useMemo(() => {
    if (typeof cp !== 'number') return cp;
    return perspective === 'white' ? cp : -cp;
  }, [cp, perspective]);

  const label = React.useMemo(() => formatEvalLabel(normalizedCp, mate), [normalizedCp, mate]);
  const { white, black } = React.useMemo(() => computeChunkFractions(normalizedCp, mate), [normalizedCp, mate]);

  const whiteLeading = normalizedCp !== undefined || mate !== undefined ? (mate ? mate > 0 : (normalizedCp ?? 0) >= 0) : true;
  const leadingFlex = whiteLeading ? white : black;
  const trailingFlex = 1 - leadingFlex;
  const leadingColor = whiteLeading ? WHITE_COLOR : BLACK_COLOR;
  const trailingColor = whiteLeading ? BLACK_COLOR : WHITE_COLOR;

  return (
    <View style={styles.container}>
      <View style={[styles.barTrack, highContrast && styles.barTrackHighContrast]}>
        <View style={[styles.leadingChunk, { flex: leadingFlex, backgroundColor: leadingColor }]} />
        <View style={[styles.trailingChunk, { flex: trailingFlex, backgroundColor: trailingColor }]} />
      </View>
      <View style={[styles.labelBubble, highContrast && styles.labelBubbleHC]}>
        <Text style={[styles.label, highContrast && styles.labelHC]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    flex: 1,
    backgroundColor: TRACK_COLOR,
  },
  barTrackHighContrast: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  leadingChunk: {
    backgroundColor: WHITE_COLOR,
  },
  trailingChunk: {
    backgroundColor: BLACK_COLOR,
  },
  labelBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  labelBubbleHC: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
  },
  label: {
    color: '#111',
    fontWeight: '700',
  },
  labelHC: {
    color: '#000',
  },
});
