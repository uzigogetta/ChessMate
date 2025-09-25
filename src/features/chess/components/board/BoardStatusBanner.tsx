import React from 'react';
import { Animated, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/ui/atoms';
import { useSettings } from '@/features/settings/settings.store';
import { BOARD_STATUS_COLORS, BoardStatus } from './BoardCore';

type Props = {
  status: BoardStatus | null;
  style?: StyleProp<ViewStyle>;
};

export function BoardStatusBanner({ status, style }: Props) {
  const hapticsEnabled = useSettings((s) => s.haptics);
  const [displayStatus, setDisplayStatus] = React.useState<BoardStatus | null>(null);
  const anim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useMemo(
    () => anim.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }),
    [anim]
  );
  const prevKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const key = status?.key ?? null;
    if (key) {
      const prevKey = prevKeyRef.current;
      prevKeyRef.current = key;
      setDisplayStatus(status);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 12, tension: 120 }).start();
      if (hapticsEnabled && key !== prevKey) {
        try {
          if (status?.kind === 'checkmate') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else if (status?.kind === 'draw' || status?.kind === 'stalemate' || status?.kind === 'material' || status?.kind === 'threefold') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else if (status?.kind === 'check') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        } catch {}
      }
    } else {
      prevKeyRef.current = null;
      Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          setDisplayStatus(null);
        }
      });
    }
  }, [status, anim, hapticsEnabled]);

  if (!displayStatus) return null;

  return (
    <Animated.View style={[styles.container, style, { transform: [{ translateY }] }]} pointerEvents="none">
      <View style={[styles.banner, { backgroundColor: BOARD_STATUS_COLORS[displayStatus.tone] }]}>
        <Text style={styles.title}>{displayStatus.title}</Text>
        {displayStatus.subtitle ? <Text style={styles.subtitle}>{displayStatus.subtitle}</Text> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginBottom: 6,
  },
  banner: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default BoardStatusBanner;
