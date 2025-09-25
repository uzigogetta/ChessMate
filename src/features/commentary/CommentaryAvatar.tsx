import React from 'react';
import { Image, View } from 'react-native';
import { Text } from '@/ui/atoms';

type Props = {
  avatar?: any;
  size?: number;
  fallback?: string;
};

export function CommentaryAvatar({ avatar, size = 64, fallback = '🤖' }: Props) {
  if (avatar) {
    return (
      <Image
        source={avatar}
        style={{ width: size, height: size, borderRadius: size * 0.32 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.46 }}>{fallback}</Text>
    </View>
  );
}


