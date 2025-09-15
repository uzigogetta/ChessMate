import React from 'react';
import { Platform, View } from 'react-native';
import ConnectionIndicator from '@/features/online/ConnectionIndicator';
import CloudUploadIndicator from '@/features/online/CloudUploadIndicator';

export default function HeaderIndicators() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        height: 28,
        minWidth: 72,
        borderRadius: 14,
        backgroundColor: Platform.OS === 'ios' ? 'rgba(60,60,67,0.2)' : 'rgba(0,0,0,0.25)'
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 6,
          backgroundColor: Platform.OS === 'ios' ? 'rgba(10,132,255,0.12)' : 'rgba(10,132,255,0.18)'
        }}
      >
        {/* Cloud occupies space even when not visible (child may render null) */}
        <CloudUploadIndicator flashOnMount />
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Platform.OS === 'ios' ? 'rgba(60,60,67,0.18)' : 'rgba(255,255,255,0.08)'
        }}
      >
        <ConnectionIndicator />
      </View>
    </View>
  );
}


