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
  const opTimer = useRef<any>(null);
  const [opGraceRed, setOpGraceRed] = useState(false);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected == null ? null : !!state.isConnected);
    });
    return () => sub && sub();
  }, []);

  // Opponent disconnect grace: show amber first, then red after 5s if still missing
  useEffect(() => {
    if (!room) {
      if (opTimer.current) { clearTimeout(opTimer.current); opTimer.current = null; }
      setOpGraceRed(false);
      return;
    }
    if (isOpponentPresent === true) {
      if (opTimer.current) { clearTimeout(opTimer.current); opTimer.current = null; }
      setOpGraceRed(false);
      return;
    }
    if (isOpponentPresent === false) {
      if (opTimer.current) { clearTimeout(opTimer.current); }
      setOpGraceRed(false);
      opTimer.current = setTimeout(() => setOpGraceRed(true), 5000);
      return;
    }
  }, [room, isOpponentPresent]);

  // Pulse only when amber
  useEffect(() => {
    const colorIndeterminate = '#FFCC00';
    const currentColor = (isConnected === false) ? '#FF3B30' : (!room ? (isConnected ? '#34C759' : '#FFCC00') : (isConnected && isOpponentPresent === true ? '#34C759' : '#FFCC00'));
    const needsPulse = currentColor === colorIndeterminate;
    if (!needsPulse) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    ).start();
    return () => { pulse.stopAnimation(); };
  }, [room, isOpponentPresent, isConnected, pulse]);

  const color = useMemo(() => {
    if (isConnected === false) return '#FF3B30';
    if (!room) return '#FFCC00';
    if (isConnected && isOpponentPresent === true) return '#34C759';
    return opGraceRed ? '#FF3B30' : '#FFCC00';
  }, [room, isOpponentPresent, isConnected, opGraceRed]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] });

  const iconName = isConnected === false ? 'wifi' : 'people';
  const iconColor = color;
  return <Animated.View style={{ transform: [{ scale }], opacity }}><Ionicons name={iconName as any} size={18} color={iconColor} /></Animated.View>;
}


