import React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';

export default function PlayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerTitle: 'Play',
          headerLargeTitle: Platform.OS === 'ios',
          headerTransparent: Platform.OS === 'ios',
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 140, gap: 20 }}
      >
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Choose a mode</Text>
        
        <Card style={{ alignItems: 'flex-start', gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>Online</Text>
          <Text muted>Find a live opponent or invite friends.</Text>
          <Button title="Go online" onPress={() => router.push('/game/online')} />
        </Card>

        <Card style={{ alignItems: 'flex-start', gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>VS AI</Text>
          <Text muted>Adjust difficulty, personas, and Coach Mode.</Text>
          <Button title="Play AI" onPress={() => router.push('/game/ai.menu')} />
        </Card>

        <Card style={{ alignItems: 'flex-start', gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>Local board</Text>
          <Text muted>Use the device as a shared board for in-person games.</Text>
          <Button title="Start local" onPress={() => router.push('/game/local')} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
