import React, { useState } from 'react';
import { View, TextInput, Pressable, Modal, Switch } from 'react-native';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { useRouter } from 'expo-router';
import { useRoomStore } from '@/features/online/room.store';
import { shortId, normalizeCode, isValidCode } from '@/match/matchCode';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
  const [side, setSide] = useState<'auto' | 'w' | 'b'>('auto');
  const [rated, setRated] = useState(false);
  const [allowTakebacks, setAllowTakebacks] = useState(false);
  const [info, setInfo] = useState<null | 'takebacks' | 'rated'>(null);
  const patchOptions = useRoomStore((s) => s.patchRoomOptions);
  const patchRated = useRoomStore((s) => s.patchRated);
  
  return (
    <Screen>
      <Stack.Screen options={{ headerTitle: 'Online Lobby' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Card style={{ gap: 12, width: 320 }}>
          <Text>Online Lobby</Text>
          <TextInput placeholder="Room Code" value={roomId} onChangeText={(v) => setRoomId(normalizeCode(v))} style={{ backgroundColor: 'rgba(120,120,128,0.16)', color: undefined, padding: 8, borderRadius: 8 }} placeholderTextColor={undefined} />
          <TextInput placeholder="Display Name" value={name} onChangeText={setName} style={{ backgroundColor: 'rgba(120,120,128,0.16)', color: undefined, padding: 8, borderRadius: 8 }} placeholderTextColor={undefined} />
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            <Button title={`Mode: ${mode}`} onPress={() => setMode((m) => (m === '1v1' ? '2v2' : '1v1'))} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            <Button title={`Side: ${side === 'auto' ? 'Auto' : side === 'w' ? 'White' : 'Black'}`} onPress={() => setSide((s) => (s === 'auto' ? 'w' : s === 'w' ? 'b' : 'auto'))} />
          </View>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable onPress={() => setInfo('rated')} hitSlop={8} style={{ padding: 4 }}>
                  <Ionicons name="information-circle-outline" size={18} color="#8E8E93" />
                </Pressable>
                <Text>Rated</Text>
              </View>
              <Switch
                value={rated}
                onValueChange={(next) => {
                  setRated(next);
                  if (next) setAllowTakebacks(false);
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: mode === '2v2' ? 0.5 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable onPress={() => setInfo('takebacks')} hitSlop={8} style={{ padding: 4 }}>
                  <Ionicons name="information-circle-outline" size={18} color="#8E8E93" />
                </Pressable>
                <Text>Allow takebacks (Undo)</Text>
              </View>
              <Switch
                value={allowTakebacks}
                onValueChange={(next) => {
                  // If turning ON while Rated is ON, automatically turn Rated OFF
                  if (next && rated) setRated(false);
                  setAllowTakebacks(next);
                }}
                disabled={mode === '2v2'}
              />
            </View>
            {(rated || mode === '2v2') && (
              <Text muted>
                {rated ? 'Takebacks are not available in rated games.' : 'Takebacks disabled for 2v2 (coming later).'}
              </Text>
            )}
          </View>
          <Button
            title="Create / Join"
            onPress={async () => {
              const id = roomId && isValidCode(roomId) ? roomId : shortId();
              await join(id, mode, name || 'Me');
              // Patch host options immediately after room appears
              setTimeout(() => {
                try {
                  patchRated(rated);
                  patchOptions({ allowTakebacks: allowTakebacks });
                } catch {}
              }, 50);
              const net = (useRoomStore.getState().net as any);
              const ensureSeat = async () => {
                const started = Date.now();
                while (!useRoomStore.getState().room && Date.now() - started < 1500) {
                  await new Promise((r) => setTimeout(r, 100));
                }
                const room = useRoomStore.getState().room;
                if (!room) return;
                const meId = useRoomStore.getState().me.id;
                const already = Object.values(room.seats).includes(meId);
                if (side === 'auto' && already) return;
                if (mode === '1v1') {
                  if (side === 'w') { net.seatSide?.('w') ?? net.seat?.('w1'); }
                  else if (side === 'b') { net.seatSide?.('b') ?? net.seat?.('b1'); }
                  else {
                    const wTaken = !!room.seats['w1'];
                    const bTaken = !!room.seats['b1'];
                    if (!wTaken) net.seatSide?.('w') ?? net.seat?.('w1');
                    else if (!bTaken) net.seatSide?.('b') ?? net.seat?.('b1');
                  }
                } else {
                  if (side === 'w') net.seatSide?.('w') ?? net.seat?.('w1');
                  else if (side === 'b') net.seatSide?.('b') ?? net.seat?.('b1');
                }
              };
              ensureSeat();
              router.push(`/game/online/${id}`);
            }}
          />
          <Button
            title="Quick Create"
            onPress={async () => {
              const id = shortId();
              await join(id, mode, name || 'Me');
              setTimeout(() => {
                try {
                  patchRated(rated);
                  patchOptions({ allowTakebacks: allowTakebacks });
                } catch {}
              }, 50);
              const net = (useRoomStore.getState().net as any);
              const ensureSeat = async () => {
                const started = Date.now();
                while (!useRoomStore.getState().room && Date.now() - started < 1500) {
                  await new Promise((r) => setTimeout(r, 100));
                }
                const room = useRoomStore.getState().room;
                if (!room) return;
                const meId = useRoomStore.getState().me.id;
                const already = Object.values(room.seats).includes(meId);
                if (side === 'auto' && already) return;
                if (mode === '1v1') {
                  if (side === 'w') net.seatSide?.('w') ?? net.seat?.('w1');
                  else if (side === 'b') net.seatSide?.('b') ?? net.seat?.('b1');
                  else {
                    const wTaken = !!room.seats['w1'];
                    const bTaken = !!room.seats['b1'];
                    if (!wTaken) net.seatSide?.('w') ?? net.seat?.('w1');
                    else if (!bTaken) net.seatSide?.('b') ?? net.seat?.('b1');
                  }
                } else {
                  if (side === 'w') net.seatSide?.('w') ?? net.seat?.('w1');
                  else if (side === 'b') net.seatSide?.('b') ?? net.seat?.('b1');
                }
              };
              ensureSeat();
              router.push(`/game/online/${id}`);
            }}
          />
        </Card>
      </View>
      <Modal visible={!!info} transparent animationType="fade" onRequestClose={() => setInfo(null)}>
        <Pressable onPress={() => setInfo(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 300, borderRadius: 16, backgroundColor: '#1C1C1E', padding: 16 }}>
            {info === 'takebacks' ? (
              <Text style={{ color: '#FFF' }}>Players can request to undo a move; the opponent must accept. This setting locks when the game starts.</Text>
            ) : (
              <Text style={{ color: '#FFF' }}>Rated games affect rating and have stricter rules. Takebacks aren’t available in rated games.</Text>
            )}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}


