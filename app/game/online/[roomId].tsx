import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { useRoomStore } from '@/features/online/room.store';
import { Seat } from '@/net/types';
import { moveToSAN } from '@/features/chess/logic/chess.rules';
import { isLegalMoveForDriver, validateMove } from '@/features/chess/logic/moveHelpers';
import { useReconnect } from '@/features/online/reconnect';
import RoomChat from '@/features/chat/RoomChat';

function SeatButton({ label, seat, takenBy, onPress, disabled, nameById }: { label: string; seat: Seat; takenBy?: string; onPress: () => void; disabled?: boolean; nameById: (id?: string) => string }) {
  const occupant = takenBy ? ` • ${nameById(takenBy)}` : '';
  return <Button title={`${label}${occupant}`} onPress={onPress} disabled={disabled} />;
}

export default function OnlineRoomScreen() {
  useReconnect();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const room = useRoomStore((s) => s.room);
  const me = useRoomStore((s) => s.me);
  const takeSeat = useRoomStore((s) => s.takeSeat);
  const passBaton = useRoomStore((s) => s.passBaton);
  const moveSAN = useRoomStore((s) => s.moveSAN);
  const leave = useRoomStore((s) => s.leave);
  const start = useRoomStore((s) => s.start);
  const mySeats = useMemo(() => {
    if (!room) return [] as Seat[];
    return (Object.keys(room.seats) as Seat[]).filter((k) => room.seats[k] === me.id);
  }, [room, me.id]);
  if (!room) {
    return (
      <Screen>
        <Text>Joining room…</Text>
      </Screen>
    );
  }
  const canMove = () => {
    const side = room.driver; // 'w' or 'b'
    return room.started && mySeats.some((s) => s.startsWith(side));
  };
  const nameById = (id?: string) => room.members.find((m) => m.id === id)?.name || '—';
  const is1v1 = room.mode === '1v1';
  return (
    <Screen style={{ justifyContent: 'flex-start' }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 48 }}>
      <Card style={{ marginBottom: 12 }}>
        <Text>{`Connected • Latency: ~?ms • Mode: ${room.mode} • Driver: ${room.driver.toUpperCase()} • Started ${room.started ? 'Yes' : 'No'}`}</Text>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <Text>{`My seats: ${mySeats.join(', ') || '—'} • Can move: ${canMove() ? 'Yes' : 'No'}`}</Text>
      </Card>
      <Card style={{ marginBottom: 12, gap: 8 }}>
        <Text>Members</Text>
        <View style={{ gap: 4 }}>
          {room.members.map((m) => (
            <Text key={m.id} muted={m.id !== me.id}>{`${m.name}${m.id === me.id ? ' (you)' : ''}`}</Text>
          ))}
        </View>
      </Card>
      <Card style={{ marginBottom: 12, gap: 8 }}>
        <Text>Seats</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {(['w1', 'w2', 'b1', 'b2'] as Seat[]).map((s) => (
            <SeatButton
              key={s}
              label={s}
              seat={s}
              takenBy={room.seats[s]}
              nameById={nameById}
              disabled={is1v1 && (s === 'w2' || s === 'b2')}
              onPress={() => takeSeat(room.seats[s] === me.id ? null : s)}
            />
          ))}
        </View>
      </Card>
      <RoomChat />
      <BoardSkia
        fen={room.fen}
        onMove={(from, to) => {
          if (!canMove()) return;
          const v = validateMove(room.fen, from, to);
          if (v.ok && v.san) moveSAN(v.san);
        }}
        onOptimisticMove={(from, to, rollback) => {
          if (!isLegalMoveForDriver(room, me.id, from, to)) return;
          const v = validateMove(room.fen, from, to);
          if (!v.ok || !v.san) return;
          // For loopback we assume immediate success; server path would set timeout and rollback on NACK
          moveSAN(v.san);
        }}
      />
      {!room.started && <Button title="Start" onPress={() => start()} />}
      {room.started && <Button title="Undo (host-loopback)" onPress={() => (useRoomStore.getState().net as any).undo?.()} />}
      <Button title="Pass Baton" onPress={() => passBaton()} />
      <Button
        title="Leave Room"
        onPress={() => {
          leave();
          router.replace('/game/online');
        }}
      />
      </ScrollView>
    </Screen>
  );
}
