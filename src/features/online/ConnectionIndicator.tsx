import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useRoomStore } from '@/features/online/room.store';

export default function ConnectionIndicator() {
  const room = useRoomStore((s) => s.room);
  const me = useRoomStore((s) => s.me);
  const opponentId = useMemo(() => {
    if (!room || !me) return undefined;
    const ids = room.members.map((m) => m.id).filter((id) => id !== me.id);
    return ids[0];
  }, [room, me]);
  const isOpponentPresent = useMemo(() => {
    if (!room || !opponentId) return null;
    return room.members.some((m) => m.id === opponentId);
  }, [room, opponentId]);
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
    // Prioritize opponent presence if in a room
    if (room) {
      if (isOpponentPresent === true) return '#34C759';
      if (isOpponentPresent === false) return '#FFCC00'; // opponent missing from presence
    }
    if (isConnected === true) return '#34C759';
    if (isConnected === false) return '#FF3B30';
    return '#FFCC00';
  }, [room, isOpponentPresent, isConnected]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] });

  const iconName = isConnected === false ? 'wifi' : 'people-circle-outline';
  const iconColor = color;
  return <Animated.View style={{ transform: [{ scale }], opacity }}><Ionicons name={iconName as any} size={18} color={iconColor} /></Animated.View>;
}


