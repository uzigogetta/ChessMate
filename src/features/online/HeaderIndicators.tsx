import React from 'react';
import { View } from 'react-native';
import ConnectionIndicator from '@/features/online/ConnectionIndicator';
import CloudUploadIndicator from '@/features/online/CloudUploadIndicator';

export default function HeaderIndicators() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 }}>
      <CloudUploadIndicator flashOnMount />
      <ConnectionIndicator />
    </View>
  );
}


