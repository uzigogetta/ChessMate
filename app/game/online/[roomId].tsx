import React from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import BoardSkia from '@/features/chess/components/board/BoardSkia';
import { useRoomStore } from '@/features/online/room.store';
import { Seat } from '@/net/types';
import { moveToSAN } from '@/features/chess/logic/chess.rules';
import { isLegalMoveForDriver, validateMove, getTurn } from '@/features/chess/logic/moveHelpers';
import { logMove } from '@/debug/netLogger';
import RoomChat from '@/features/chat/RoomChat';
import { ReconnectListener } from '@/features/online/reconnect';
import { DevOverlay } from '@/ui/DevOverlay';

function SeatButton({ label, seat, takenBy, onPress, disabled, nameById, meId }: { label: string; seat: Seat; takenBy?: string; onPress: () => void; disabled?: boolean; nameById: (id?: string) => string; meId: string }) {
  const occupant = takenBy ? ` • ${takenBy === meId ? 'you' : nameById(takenBy)}` : '';
  return <Button title={`${label}${occupant}`} onPress={onPress} disabled={disabled} />;
}

export default function OnlineRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const room = useRoomStore((s) => s.room);
  const me = useRoomStore((s) => s.me);
  const takeSeat = useRoomStore.getState().takeSeat;
  const passBaton = useRoomStore.getState().passBaton;
  const moveSAN = useRoomStore.getState().moveSAN;
  const leave = useRoomStore.getState().leave;
  const start = useRoomStore.getState().start;
  const resign = useRoomStore.getState().resign;
  const offerDraw = useRoomStore.getState().offerDraw;
  const mySeats: Seat[] = room ? (Object.keys(room.seats) as Seat[]).filter((k) => room.seats[k] === me.id) : [];
  const mySide: 'w' | 'b' | null = room ? (mySeats.some((s) => s.startsWith('w')) ? 'w' : mySeats.some((s) => s.startsWith('b')) ? 'b' : null) : null;
  const canMove = () => !!room && room.started && !!mySide && mySide === room.driver;
  const nameById = (id?: string) => (room?.members || []).find((m) => m.id === id)?.name || '—';
  const is1v1 = room?.mode === '1v1';
  const minimal = is1v1;
  const isMyTurn = !!room?.started && !!mySide && mySide === getTurn(room.fen);
  const readyToStart = room ? (is1v1 ? !!room.seats['w1'] && !!room.seats['b1'] : (!!room.seats['w1'] || !!room.seats['w2']) && (!!room.seats['b1'] || !!room.seats['b2'])) : false;
  return (
    <Screen style={{ justifyContent: 'flex-start' }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 48 }} nestedScrollEnabled>
        <ReconnectListener />
        {!room && (
          <>
            <Card style={{ marginBottom: 12 }}>
              <Text>{`Room ${roomId}`}</Text>
            </Card>
            <Text>Joining room…</Text>
          </>
        )}
        {!!room && (
          <>
            <Card style={{ marginBottom: 12 }}>
              <Text>{isMyTurn ? 'Your turn' : `${room.driver === 'w' ? 'White' : 'Black'} to move`}</Text>
              <Text muted>{`Room ${room.roomId} • You: ${mySide ? (mySide === 'w' ? 'White' : 'Black') : 'Spectator'} • ${room.members.length} players`}</Text>
            </Card>
            <Card style={{ marginBottom: 12, gap: 8 }}>
              <Text>Members</Text>
              <View style={{ gap: 4 }}>
                {room.members.map((m) => (
                  <Text key={m.id} muted={m.id !== me.id}>{`${m.name}${m.id === me.id ? ' (you)' : ''}`}</Text>
                ))}
              </View>
            </Card>
            {!minimal && (
              <Card style={{ marginBottom: 12, gap: 8 }}>
                <Text>Seats</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Button title="Join White" disabled={!!room.seats['w1'] && room.seats['w1'] !== me.id} onPress={() => ((useRoomStore.getState().net as any).seatSide?.('w') ?? takeSeat('w1'))} />
                  <Button title="Join Black" disabled={!!room.seats['b1'] && room.seats['b1'] !== me.id} onPress={() => ((useRoomStore.getState().net as any).seatSide?.('b') ?? takeSeat('b1'))} />
                  {mySeats.length > 0 && <Button title="Release Seat" onPress={() => ((useRoomStore.getState().net as any).releaseSeat?.() ?? takeSeat(null))} />}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {((room.mode === '1v1' ? ['w1', 'b1'] : ['w1', 'w2', 'b1', 'b2']) as Seat[]).map((s) => (
                    <SeatButton
                      key={s}
                      label={s}
                      seat={s}
                      takenBy={room.seats[s]}
                      nameById={nameById}
                      meId={me.id}
                      disabled
                      onPress={() => {}}
                    />
                  ))}
                </View>
              </Card>
            )}
            <RoomChat />
            <BoardSkia
              fen={room.fen}
              orientation={mySide ?? 'w'}
              selectableColor={mySide ?? 'w'}
              onMove={(from, to) => {
                const turn = getTurn(room.fen);
                if (!room.started || !mySide || mySide !== turn) return;
                const v = validateMove(room.fen, from, to);
                if (v.ok && v.san) {
                  logMove('UI request', { san: v.san, from: mySide, fen: room.fen });
                  moveSAN(v.san);
                }
              }}
              onOptimisticMove={(from, to, rollback) => {
                if (!isLegalMoveForDriver(room, me.id, from, to)) return;
                const v = validateMove(room.fen, from, to);
                if (!v.ok || !v.san) return;
                moveSAN(v.san);
              }}
            />
            <Card style={{ marginTop: 12, gap: 8, flexDirection: 'row' }}>
              {room.started && <Button title="Undo" onPress={() => (useRoomStore.getState().net as any).undo?.()} />}
              <Button title="Resign" onPress={() => resign()} />
              <Button title="Offer Draw" onPress={() => offerDraw()} />
              {__DEV__ && <Button title="Reset" onPress={() => { /* dev-only placeholder */ }} />}
              {room.mode === '2v2' && mySide === room.driver && <Button title="Pass Baton" onPress={() => passBaton()} />}
            </Card>
            {!room.started && <Button title="Start Game" onPress={() => start()} disabled={!readyToStart} />}
            <Button
              title="Leave Room"
              onPress={() => {
                leave();
                router.replace('/game/online');
              }}
            />
          </>
        )}
      </ScrollView>
      <DevOverlay />
    </Screen>
  );
}
