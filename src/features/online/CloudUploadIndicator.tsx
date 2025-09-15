import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isUploaded } from '@/archive/cloud';
import { useRoomStore } from '@/features/online/room.store';

export default function CloudUploadIndicator({ flashOnMount }: { flashOnMount?: boolean }) {
  const room = useRoomStore((s) => s.room);
  const [isUploading, setIsUploading] = useState(false);
  const [introActive, setIntroActive] = useState(true);
  const [visible, setVisible] = useState(true);
  const pulse = useRef(new Animated.Value(0)).current;

  // One-shot intro pulse on entry
  useEffect(() => {
    const INTRO_MS = Platform.OS === 'ios' ? 5000 : 3000;
    setIntroActive(true);
    setVisible(true);
    const t = setTimeout(() => { setIntroActive(false); if (!isUploading) setVisible(false); }, INTRO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Upload pulse when game finishes until cloud confirms
  useEffect(() => {
    if (!room) return;
    if (room.phase !== 'RESULT') { setIsUploading(false); if (!introActive) setVisible(false); return; }
    const keyPrefix = `${room.roomId}-${room.finishedAt || ''}`;
    const maybeIds = [keyPrefix, `${room.roomId}-${room.finishedAt || Date.now()}`];
    const uploaded = maybeIds.some((id) => isUploaded(id));
    const uploading = !uploaded;
    setIsUploading(uploading);
    setVisible(uploading || introActive);
    if (!uploading) return;
    const interval = setInterval(() => {
      const done = maybeIds.some((id) => isUploaded(id));
      if (done) {
        setIsUploading(false);
        if (!introActive) setVisible(false);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.phase, room?.roomId, room?.finishedAt, introActive]);

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(0);
    }
  }, [visible, pulse]);

  if (!room || !visible) return null;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] });

  return <Animated.View style={{ transform: [{ scale }], opacity }}><Ionicons name="cloud-upload-outline" size={18} color="#0A84FF" /></Animated.View>;
}


