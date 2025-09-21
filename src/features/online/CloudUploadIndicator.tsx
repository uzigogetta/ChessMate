import React, { useEffect, useState } from 'react';
import { View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isUploaded } from '@/shared/cloud';
import { useRoomStore } from '@/features/online/room.store';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);

// Professional cloud colors
const COLORS = {
  light: {
    uploading: '#007AFF',
    success: '#34C759',
    intro: '#007AFF', // Blue for better visibility
  },
  dark: {
    uploading: '#0A84FF',
    success: '#30D158',
    intro: '#0A84FF', // Blue for better visibility in dark mode
  },
};

export default function CloudUploadIndicator({ flashOnMount }: { flashOnMount?: boolean }) {
  const scheme = useColorScheme();
  const room = useRoomStore((s) => s.room);
  const [isUploading, setIsUploading] = useState(false);
  const [introActive, setIntroActive] = useState(true);
  const [visible, setVisible] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Animation values
  const pulseAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const rotateAnim = useSharedValue(0);
  const colorAnim = useSharedValue(0); // 0 = intro, 0.5 = uploading, 1 = success
  const successAnim = useSharedValue(0);
  
  const colors = scheme === 'dark' ? COLORS.dark : COLORS.light;

  // One-shot intro pulse on entry
  useEffect(() => {
    const INTRO_MS = 3000;
    setIntroActive(true);
    setVisible(true);
    colorAnim.value = 0; // Start with intro color
    
    const t = setTimeout(() => { 
      setIntroActive(false); 
      if (!isUploading) {
        setVisible(false);
      }
    }, INTRO_MS);
    
    return () => clearTimeout(t);
  }, []);

  // Upload pulse when game finishes until cloud confirms
  useEffect(() => {
    if (!room) return;
    if (room.phase !== 'RESULT') { 
      setIsUploading(false); 
      if (!introActive) setVisible(false); 
      return; 
    }
    
    const keyPrefix = `${room.roomId}-${room.finishedAt || ''}`;
    const maybeIds = [keyPrefix, `${room.roomId}-${room.finishedAt || Date.now()}`];
    const uploaded = maybeIds.some((id) => isUploaded(id));
    const uploading = !uploaded;
    
    setIsUploading(uploading);
    setVisible(uploading || introActive);
    
    // Update color animation
    if (uploading) {
      colorAnim.value = withSpring(0.5, { damping: 20, stiffness: 100 });
    }
    
    if (!uploading) return;
    
    const interval = setInterval(() => {
      const done = maybeIds.some((id) => isUploaded(id));
      if (done) {
        setIsUploading(false);
        setUploadSuccess(true);
        
        // Success animation
        colorAnim.value = withSpring(1, { damping: 20, stiffness: 100 });
        successAnim.value = withSequence(
          withSpring(1, { damping: 15, stiffness: 300 }),
          withTiming(0, { duration: 500, delay: 500 })
        );
        
        // Hide after success animation
        setTimeout(() => {
          if (!introActive) setVisible(false);
          setUploadSuccess(false);
        }, 1500);
        
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [room?.phase, room?.roomId, room?.finishedAt, introActive, colorAnim, successAnim]);

  // Smooth pulse animation
  useEffect(() => {
    if (visible && !uploadSuccess) {
      // Different pulse styles for intro vs uploading
      if (introActive) {
        // Gentle breathing for intro
        pulseAnim.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        );
      } else if (isUploading) {
        // Faster pulse for uploading with rotation
        pulseAnim.value = withRepeat(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
        
        // Continuous rotation while uploading
        rotateAnim.value = withRepeat(
          withTiming(360, { duration: 3000, easing: Easing.linear }),
          -1,
          false
        );
      }
    } else {
      pulseAnim.value = withTiming(0, { duration: 300 });
      rotateAnim.value = withTiming(0, { duration: 300 });
    }
  }, [visible, introActive, isUploading, uploadSuccess, pulseAnim, rotateAnim]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      pulseAnim.value,
      [0, 1],
      introActive ? [1, 1.15] : [1, 1.2]
    );
    
    const opacity = interpolate(
      pulseAnim.value,
      [0, 1],
      introActive ? [1, 0.7] : [1, 0.6]
    );
    
    // Success bounce
    const successScale = interpolate(
      successAnim.value,
      [0, 1],
      [1, 1.3]
    );

    return {
      transform: [
        { scale: scale * scaleAnim.value * (uploadSuccess ? successScale : 1) },
        { rotate: `${rotateAnim.value}deg` },
      ],
      opacity: uploadSuccess ? successAnim.value : opacity,
    };
  });

  const iconColorStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        colorAnim.value,
        [0, 0.5, 1],
        [colors.intro, colors.uploading, colors.success]
      ),
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    if (!uploadSuccess) return { opacity: 0 };
    
    return {
      opacity: interpolate(successAnim.value, [0, 1], [0, 0.4]),
      transform: [{ 
        scale: interpolate(successAnim.value, [0, 1], [1, 2])
      }],
      backgroundColor: colors.success,
    };
  });

  if (!room || !visible) return null;

  // Use different icon for success
  const iconName = uploadSuccess ? 'cloud-done' : 'cloud-upload-outline';

  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      {/* Success glow */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 20,
            height: 20,
            borderRadius: 10,
          },
          glowStyle,
        ]}
      />
      
      {/* Main icon */}
      <Animated.View style={animatedStyle}>
        <AnimatedIcon
          name={iconName as any}
          size={18}
          style={iconColorStyle}
        />
      </Animated.View>
    </View>
  );
}