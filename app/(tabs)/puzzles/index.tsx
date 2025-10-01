import React from 'react';
import { View, Text } from 'react-native';

export default function PuzzlesScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Puzzles</Text>
      <Text style={{ opacity: 0.68 }}>Daily drills and streaks coming soon.</Text>
    </View>
  );
}



