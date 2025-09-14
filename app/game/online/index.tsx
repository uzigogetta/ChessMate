import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { useRouter } from 'expo-router';
import { useRoomStore } from '@/features/online/room.store';

function randomId(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function OnlineLobby() {
  const router = useRouter();
  const join = useRoomStore((s) => s.join);
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'1v1' | '2v2'>('1v1');
  return (
    <Screen>
      <Card style={{ gap: 12, width: 320 }}>
        <Text>Online Lobby</Text>
        <TextInput placeholder="Room ID" value={roomId} onChangeText={setRoomId} style={{ backgroundColor: '#222', color: 'white', padding: 8, borderRadius: 8 }} />
        <TextInput placeholder="Display Name" value={name} onChangeText={setName} style={{ backgroundColor: '#222', color: 'white', padding: 8, borderRadius: 8 }} />
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          <Button title={`Mode: ${mode}`} onPress={() => setMode((m) => (m === '1v1' ? '2v2' : '1v1'))} />
        </View>
        <Button
          title="Create / Join"
          onPress={async () => {
            const id = roomId || randomId();
            await join(id, mode, name || 'Me');
            router.push(`/game/online/${id}`);
          }}
        />
        <Button
          title="Quick Join"
          onPress={async () => {
            const id = randomId();
            await join(id, mode, name || 'Me');
            router.push(`/game/online/${id}`);
          }}
        />
      </Card>
    </Screen>
  );
}


