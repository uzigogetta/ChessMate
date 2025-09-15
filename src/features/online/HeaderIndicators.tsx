import React from 'react';
import { View } from 'react-native';
import ConnectionIndicator from '@/features/online/ConnectionIndicator';
import CloudUploadIndicator from '@/features/online/CloudUploadIndicator';

export default function HeaderIndicators() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 28, minWidth: 72 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 6
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
          
        }}
      >
        <ConnectionIndicator />
      </View>
    </View>
  );
}


