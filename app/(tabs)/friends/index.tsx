import React from 'react';
import { View, Text } from 'react-native';

export default function FriendsScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Friends</Text>
      <Text style={{ opacity: 0.68 }}>Coming soon: invites, presence, and recents.</Text>
    </View>
  );
}


