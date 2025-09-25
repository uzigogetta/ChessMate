import React from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { Text } from '@/ui/atoms';
import { CommentaryAvatar } from './CommentaryAvatar';
import { useCommentarySettings } from './commentary.settings';
import { useLatestComment } from './useCommentaryFeed';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

type Persona = {
  name: string;
  title?: string;
  avatar?: any;
  fallback?: string;
  gradient?: string[];
};

type CommentaryStripProps = {
  roomId: string;
  persona: Persona;
  evaluation?: string;
  style?: any;
};

export function CommentaryStrip({ roomId, persona, evaluation, style }: CommentaryStripProps) {
  const settings = useCommentarySettings();
  const latest = useLatestComment(roomId);
  const message = settings.enabled ? latest?.txt ?? 'Let’s play a brilliant game.' : 'Coach commentary disabled';

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const msgKey = latest?.id ?? message;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
    return () => fadeAnim.setValue(0);
  }, [msgKey, fadeAnim]);

  const Container = Platform.OS === 'ios' ? BlurView : View;
  const containerProps = Platform.OS === 'ios' ? ({ intensity: 40, tint: 'dark' } as any) : {};
  const colors = persona.gradient ?? ['rgba(124,77,255,0.35)', 'rgba(58,131,244,0.2)'];

  return (
    <Container {...containerProps} style={[styles.container, style]}>
      <LinearGradient colors={colors} style={styles.gradientOverlay} />
      <View style={styles.avatarShell}>
        <CommentaryAvatar avatar={persona.avatar} fallback={persona.fallback ?? '🤖'} size={72} />
      </View>
      <View style={styles.metaZone}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.name}>{persona.name}</Text>
            {persona.title ? <Text muted style={styles.title}>{persona.title}</Text> : null}
          </View>
          {evaluation ? (
            <Animated.View style={[styles.evalPill, { opacity: fadeAnim }]}> 
              <Text style={styles.evalText}>{evaluation}</Text>
            </Animated.View>
          ) : null}
        </View>
        <Animated.View style={[styles.bubble, { opacity: fadeAnim }]}> 
          <Text style={styles.message}>{message}</Text>
          <Text muted style={styles.timestamp}>{settings.enabled && latest ? new Date(latest.ts).toLocaleTimeString() : ''}</Text>
        </Animated.View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 24,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(31,31,35,0.72)' : 'rgba(31,31,35,0.88)',
    overflow: 'hidden',
    borderWidth: Platform.OS === 'ios' ? 0 : StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  avatarShell: {
    paddingRight: 12,
  },
  metaZone: {
    flex: 1,
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.64)',
  },
  evalPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(124,77,255,0.22)',
  },
  evalText: {
    color: '#d0bcff',
    fontWeight: '600',
    fontSize: 13,
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    gap: 4,
    backgroundColor: 'rgba(118,106,200,0.22)',
  },
  message: {
    color: '#f4f4f4',
    fontSize: 15,
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(244,244,244,0.6)',
  },
});


