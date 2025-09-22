import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AIMenuScreen() {
  const [level, setLevel] = React.useState<1|2|3|4|5|6|7|8|9|10|11|12>(4);
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <Stack.Screen options={{ headerTitle: 'Play vs AI', headerTransparent: false }} />
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(16, insets.bottom + 12), gap: 16 }}
      >
        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Difficulty</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((lv) => (
              <Pressable key={lv} onPress={() => setLevel(lv as any)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: level===lv ? '#0A84FF' : '#999', opacity: level===lv ? 1 : 0.7 }}>
                <Text>{`Lv${lv}`}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
        <Button title="Start Game" onPress={() => router.push({ pathname: '/game/ai', params: { level: String(level) } })} />
      </ScrollView>
    </Screen>
  );
}


