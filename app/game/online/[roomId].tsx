import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, Text } from '@/ui/atoms';

export default function OnlineRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  return (
    <Screen>
      <Card>
        <Text>{`Room: ${roomId ?? ''}`}</Text>
      </Card>
    </Screen>
  );
}


