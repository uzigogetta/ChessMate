import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { isUploaded } from '@/archive/cloud';
import { useRoomStore } from '@/features/online/room.store';

export default function CloudUploadIndicator({ flashOnMount }: { flashOnMount?: boolean }) {
  const room = useRoomStore((s) => s.room);
  const [isUploading, setIsUploading] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!room) return;
    // Trigger flashing when entering RESULT until archived+uploaded
    if (room.phase === 'RESULT') {
      const keyPrefix = `${room.roomId}-${room.finishedAt || ''}`;
      const maybeIds = [keyPrefix, `${room.roomId}-${room.finishedAt || Date.now()}`];
      const uploaded = maybeIds.some((id) => isUploaded(id));
      setIsUploading(!uploaded);
    } else {
      setIsUploading(false);
    }
  }, [room?.phase, room?.roomId, room?.finishedAt]);

  useEffect(() => {
    if (isUploading || flashOnMount) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
        ])
      ).start();
      if (flashOnMount && !isUploading) {
        const t = setTimeout(() => {
          pulse.stopAnimation();
          pulse.setValue(0);
        }, 1200);
        return () => clearTimeout(t);
      }
    } else {
      pulse.stopAnimation();
      pulse.setValue(0);
    }
  }, [isUploading, flashOnMount, pulse]);

  if (!room) return null;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] });

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 2,
          backgroundColor: '#0A84FF'
        }}
      />
    </Animated.View>
  );
}


