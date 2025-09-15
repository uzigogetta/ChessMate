import React from 'react';
import { Platform, View } from 'react-native';
import ConnectionIndicator from '@/features/online/ConnectionIndicator';
import CloudUploadIndicator from '@/features/online/CloudUploadIndicator';

export default function HeaderIndicators() {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: Platform.OS === 'ios' ? 26 : 26 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
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
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <ConnectionIndicator />
      </View>
    </View>
  );
  // No background; keep iOS header height footprint (26) but transparent
  return content;
}


