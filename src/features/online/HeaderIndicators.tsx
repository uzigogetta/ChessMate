import React from 'react';
import { View } from 'react-native';
import ConnectionIndicator from '@/features/online/ConnectionIndicator';
import CloudUploadIndicator from '@/features/online/CloudUploadIndicator';

export default function HeaderIndicators() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
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
          width: 20,
          height: 20,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <ConnectionIndicator />
      </View>
    </View>
  );
}


