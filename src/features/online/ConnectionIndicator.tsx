import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useRoomStore } from '@/features/online/room.store';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  interpolateColor,
  withSpring,
} from 'react-native-reanimated';

const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);

export default function ConnectionIndicator() {
  const scheme = useColorScheme();
  const room = useRoomStore((s) => s.room);
  const me = useRoomStore((s) => s.me);
  const net = useRoomStore.getState().net as any;
  const hasOpponent = useMemo(() => {
    if (!room) return false;
    return room.members.some((m) => m.id !== me.id);
  }, [room, me.id]);
  
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const opTimer = useRef<any>(null);
  const [opGraceRed, setOpGraceRed] = useState(false);
  const [inReconnectHold, setInReconnectHold] = useState(false);
  const prevConnRef = useRef<boolean | null>(null);
  const reconnectHoldUntilRef = useRef<number>(0);
  const prevHasOppRef = useRef<boolean>(false);
  const joinHoldUntilRef = useRef<number>(0);
  const offlineTimer = useRef<any>(null);
  const [offlineGraceRed, setOfflineGraceRed] = useState(false);
  
  // Animation values
  const colorAnim = useSharedValue(0); // 0 = amber, 0.5 = red, 1 = green
  const pulseAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected == null ? null : !!state.isConnected);
    });
    return () => sub && sub();
  }, []);

  // Device offline -> amber for a short grace, then red
  useEffect(() => {
    if (isConnected === false) {
      setOfflineGraceRed(false);
      if (offlineTimer.current) clearTimeout(offlineTimer.current);
      offlineTimer.current = setTimeout(() => setOfflineGraceRed(true), 3000);
    } else if (isConnected === true) {
      if (offlineTimer.current) clearTimeout(offlineTimer.current);
      offlineTimer.current = null;
      setOfflineGraceRed(false);
    }
  }, [isConnected]);

  // On reconnect: return to amber (not red) until presence confirms opponent
  useEffect(() => {
    if (isConnected) {
      setOpGraceRed(false);
      // Hold green off briefly even if presence says opponent is here
      setInReconnectHold(true);
      const t = setTimeout(() => setInReconnectHold(false), 1800);
      if (room && hasOpponent === false) {
        if (opTimer.current) clearTimeout(opTimer.current);
        opTimer.current = setTimeout(() => setOpGraceRed(true), 7000);
      }
      return () => clearTimeout(t);
    }
  }, [isConnected, room, hasOpponent]);

  // Presence-based awareness: if I have no room, treat opponent as missing
  useEffect(() => {
    if (!room) {
      // no-op: isOpponentPresent stays derived
    }
  }, [room]);

  // Opponent disconnect grace: show amber first, then red after 7s if still missing;
  // when opponent reappears, hold amber briefly to avoid red→green flash
  useEffect(() => {
    if (!room) {
      if (opTimer.current) { clearTimeout(opTimer.current); opTimer.current = null; }
      setOpGraceRed(false);
      return;
    }
    if (hasOpponent === true) {
      // Rising edge: opponent just joined
      if (prevHasOppRef.current === false) {
        setOpGraceRed(false);
        joinHoldUntilRef.current = Date.now() + 1200; // amber hold on join
      }
      if (opTimer.current) { clearTimeout(opTimer.current); opTimer.current = null; }
      setOpGraceRed(false);
      prevHasOppRef.current = true;
      return;
    }
    if (hasOpponent === false) {
      if (opTimer.current) { clearTimeout(opTimer.current); }
      setOpGraceRed(false);
      opTimer.current = setTimeout(() => setOpGraceRed(true), 7000);
      prevHasOppRef.current = false;
      return;
    }
  }, [room, hasOpponent]);

  const color = useMemo(() => {
    if (isConnected === false) return offlineGraceRed ? '#FF3B30' : '#FF9500';
    if (!room) return '#FF9500';
    if (inReconnectHold) return '#FF9500';
    if (isConnected && hasOpponent === true) return '#34C759';
    return opGraceRed ? '#FF3B30' : '#FF9500';
  }, [room, hasOpponent, isConnected, opGraceRed, inReconnectHold, offlineGraceRed]);

  const iconName = isConnected === false ? 'wifi' : 'people';
  
  // Detect immediate reconnect within the same render to avoid a green flash
  if (prevConnRef.current === false && isConnected === true) {
    reconnectHoldUntilRef.current = Date.now() + 1800;
  }
  const holdNow = isConnected === true && Date.now() < reconnectHoldUntilRef.current;
  const holdJoinNow = Date.now() < joinHoldUntilRef.current;
  prevConnRef.current = isConnected;

  const status = useMemo(() => {
    if (isConnected === false) return 'offline';
    if (!room) return 'amber';
    if (inReconnectHold || holdNow || holdJoinNow) return 'amber';
    if (isConnected && hasOpponent === true) return 'green';
    return opGraceRed ? 'red' : 'amber';
  }, [isConnected, room, inReconnectHold, holdNow, holdJoinNow, hasOpponent, opGraceRed]);

  // Update color animation based on current color
  useEffect(() => {
    const targetValue = color === '#34C759' ? 1 : color === '#FF3B30' ? 0.5 : 0;
    colorAnim.value = withSpring(targetValue, {
      damping: 20,
      stiffness: 120,
      mass: 1,
    });
    
    // Trigger glow effect on green
    if (color === '#34C759' && targetValue === 1) {
      glowAnim.value = withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [color, colorAnim, glowAnim]);

  // Pulse animation for amber state
  useEffect(() => {
    const needsPulse = color === '#FF9500';
    if (needsPulse) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulseAnim.value = withTiming(0, { duration: 300 });
    }
  }, [color, pulseAnim]);

  // Scale bounce on status change
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      scaleAnim.value = withSequence(
        withSpring(0.85, { damping: 15, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 300 })
      );
      prevStatusRef.current = status;
    }
  }, [status, scaleAnim]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      pulseAnim.value,
      [0, 1],
      [1, 1.2]
    );
    
    const opacity = interpolate(
      pulseAnim.value,
      [0, 1],
      [1, 0.65]
    );

    return {
      transform: [{ scale: scaleAnim.value * scale }],
      opacity,
    };
  });

  const iconColorStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        colorAnim.value,
        [0, 0.5, 1],
        ['#FF9500', '#FF3B30', '#34C759']
      ),
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      glowAnim.value,
      [0, 1],
      [0, 0.3]
    );
    
    const scale = interpolate(
      glowAnim.value,
      [0, 1],
      [1, 1.8]
    );

    return {
      opacity,
      transform: [{ scale }],
      backgroundColor: '#34C759',
    };
  });

  return (
    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow effect for connected state */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 22,
            height: 22,
            borderRadius: 11,
          },
          glowStyle,
        ]}
      />
      
      {/* Main icon */}
      <Animated.View style={animatedStyle}>
        <AnimatedIcon
          name={iconName as any}
          size={20}
          style={iconColorStyle}
        />
      </Animated.View>
    </View>
  );
}