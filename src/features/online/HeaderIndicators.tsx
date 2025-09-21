import React, { useEffect, useState } from 'react';
import { View, useColorScheme } from 'react-native';
import CloudUploadIndicator from '@/features/online/CloudUploadIndicator';
import { useRoomStore } from '@/features/online/room.store';
import { isUploaded } from '@/shared/cloud';
import { useSettings } from '../settings/settings.store';
import { themes, ThemeName, getTheme } from '@/ui/tokens';
import { BlurView } from 'expo-blur';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence, 
  withSpring,
  Easing
} from 'react-native-reanimated';
import ConnectionIndicator from '@/features/online/ConnectionIndicator';

export default function HeaderIndicators() {
  const room = useRoomStore((s) => s.room);
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const highContrast = useSettings((s) => s.highContrast);
  const c = getTheme(active, { highContrast });
  const reduceMotion = useSettings((s) => s.reduceMotion);

  const [introFlash, setIntroFlash] = useState(true);
  useEffect(() => {
    // Show intro for 3 seconds on mount
    const timer = setTimeout(() => {
      setIntroFlash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const [resultHold, setResultHold] = useState(false);
  useEffect(() => {
    if (room?.finishedAt) {
      setResultHold(true);
      const t = setTimeout(() => setResultHold(false), 3000);
      return () => clearTimeout(t);
    }
    setResultHold(false);
  }, [room?.finishedAt]);

  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (!room || room.phase !== 'RESULT') {
      setUploading(false);
      return;
    }
    const check = () => {
      const keyPrefix = `${room.roomId}-${room.finishedAt || ''}`;
      const maybeIds = [keyPrefix, `${room.roomId}-${room.finishedAt || Date.now()}`];
      return !maybeIds.some((id) => isUploaded(id));
    };
    setUploading(check());
    const t = setInterval(() => setUploading(check()), 800);
    return () => clearInterval(t);
  }, [room?.phase, room?.roomId, room?.finishedAt]);

  const cloudVisible = introFlash || resultHold || uploading;

  const animatedCloudStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        opacity: cloudVisible ? 1 : 0,
        transform: [{ scale: cloudVisible ? 1 : 0.95 }],
      };
    }
    return {
      opacity: withTiming(cloudVisible ? 1 : 0, { 
        duration: cloudVisible ? 200 : 300,
        easing: cloudVisible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic)
      }),
      transform: [{ 
        scale: withSpring(cloudVisible ? 1 : 0.7, {
          damping: 15,
          stiffness: 150,
          mass: 1,
        })
      }],
    };
  });

  const animatedPulseStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { opacity: 1, transform: [{ scale: 1 }] };
    }
    // No pulsing needed here since CloudUploadIndicator handles its own animation
    return {
      opacity: 1,
      transform: [{ scale: 1 }],
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    // Reduced gap between icons for tighter spacing
    // When collapsed: 36px (just connection icon)
    // When expanded: 64px (cloud + smaller gap + connection)
    const targetWidth = cloudVisible ? 64 : 36;
    if (reduceMotion) {
      return { width: targetWidth };
    }
    return {
      width: withSpring(targetWidth, {
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      }),
    };
  });

  // Add subtle shadow for depth
  const shadowStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  };

  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Animated.View style={[
        { borderRadius: 18, overflow: 'hidden', height: 36 },
        shadowStyle,
        animatedContainerStyle
      ]}>
        <BlurView 
          intensity={30} 
          tint={active} 
          style={{ 
            flex: 1, 
            flexDirection: 'row', 
            alignItems: 'center', 
            position: 'relative'
          }}
        >
          {/* Cloud icon - moved more to the right to reduce gap */}
          <View style={{ 
            position: 'absolute', 
            left: 6, 
            width: 24, 
            height: 24, 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Animated.View style={animatedCloudStyle}>
              <Animated.View style={animatedPulseStyle}>
                <CloudUploadIndicator flashOnMount={false} />
              </Animated.View>
            </Animated.View>
          </View>
          
          {/* Connection icon - fixed position on the right */}
          <View style={{ 
            position: 'absolute', 
            right: 4, 
            width: 28, 
            height: 28, 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <ConnectionIndicator />
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}


