import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isUploaded } from '@/archive/cloud';
import { useRoomStore } from '@/features/online/room.store';

export default function CloudUploadIndicator({ flashOnMount }: { flashOnMount?: boolean }) {
  const room = useRoomStore((s) => s.room);
  const [isUploading, setIsUploading] = useState(false);
  const [visible, setVisible] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!room) return;
    // Trigger flashing when entering RESULT until archived+uploaded
    if (room.phase === 'RESULT' || flashOnMount) {
      const keyPrefix = `${room.roomId}-${room.finishedAt || ''}`;
      const maybeIds = [keyPrefix, `${room.roomId}-${room.finishedAt || Date.now()}`];
      const uploaded = maybeIds.some((id) => isUploaded(id));
      const uploading = !uploaded;
      setIsUploading(uploading || !!flashOnMount);
      setVisible(uploading || !!flashOnMount);
      // Poll for upload completion to auto-hide without requiring a room/state change
      if (uploading) {
        const interval = setInterval(() => {
          const done = maybeIds.some((id) => isUploaded(id));
          if (done) {
            setIsUploading(false);
            setVisible(false);
            clearInterval(interval);
          }
        }, 1000);
        return () => clearInterval(interval);
      }
    } else {
      setIsUploading(false);
      if (!flashOnMount) setVisible(false);
    }
  }, [room?.phase, room?.roomId, room?.finishedAt, flashOnMount]);

  useEffect(() => {
    if (isUploading || flashOnMount) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
        ])
      ).start();
      if (flashOnMount && !isUploading) {
        setVisible(true);
        const t = setTimeout(() => {
          pulse.stopAnimation();
          pulse.setValue(0);
          setVisible(false);
        }, 3000);
        return () => clearTimeout(t);
      }
    } else {
      pulse.stopAnimation();
      pulse.setValue(0);
    }
  }, [isUploading, flashOnMount, pulse]);

  if (!room || !visible) return null;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] });

  return <Animated.View style={{ transform: [{ scale }], opacity }}><Ionicons name="cloud-upload-outline" size={18} color="#0A84FF" /></Animated.View>;
}


