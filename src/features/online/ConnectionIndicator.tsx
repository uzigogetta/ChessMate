import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export default function ConnectionIndicator() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected == null ? null : !!state.isConnected);
    });
    return () => sub && sub();
  }, []);

  useEffect(() => {
    if (isConnected) {
      pulse.stopAnimation();
      pulse.setValue(0);
    } else {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
        ])
      ).start();
    }
  }, [isConnected, pulse]);

  const color = useMemo(() => {
    if (isConnected === true) return '#34C759'; // iOS green
    if (isConnected === false) return '#FF3B30'; // iOS red
    return '#FFCC00'; // iOS yellow (unknown)
  }, [isConnected]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] });

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: color,
          marginRight: 8
        }}
      />
    </Animated.View>
  );
}


