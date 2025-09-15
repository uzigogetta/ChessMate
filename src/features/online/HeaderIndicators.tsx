import React from 'react';
import { Platform, View } from 'react-native';
import ConnectionIndicator from '@/features/online/ConnectionIndicator';
import CloudUploadIndicator from '@/features/online/CloudUploadIndicator';

export default function HeaderIndicators() {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {/* Cloud occupies space even when not visible (child may render null) */}
        <CloudUploadIndicator flashOnMount />
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <ConnectionIndicator />
      </View>
    </View>
  );
  if (Platform.OS === 'ios') {
    return (
      <View style={{ backgroundColor: 'rgba(60,60,67,0.2)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
        {content}
      </View>
    );
  }
  return content;
}


