import React from 'react';
import { View } from 'react-native';
import { Text } from '@/ui/atoms';

export type RoomToastsProps = {
  archiveToast: string | null;
  leftToast: string | null;
  joinToast: string | null;
};

export function RoomToasts({ archiveToast, leftToast, joinToast }: RoomToastsProps) {
  return (
    <>
      {archiveToast && (
        <View style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}>
            <Text style={{ color: 'white' }}>{archiveToast}</Text>
          </View>
        </View>
      )}
      {leftToast && (
        <View style={{ position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 }}>
            <Text style={{ color: 'white' }}>{leftToast}</Text>
          </View>
        </View>
      )}
      {joinToast && (
        <View style={{ position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 }}>
            <Text style={{ color: 'white' }}>{joinToast}</Text>
          </View>
        </View>
      )}
    </>
  );
}
