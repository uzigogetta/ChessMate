import React from 'react';
import { View } from 'react-native';
import { Card, Button, Text } from '@/ui/atoms';
import type { RoomState, Seat } from '@/net/types';

export type SeatControlsProps = {
  room: RoomState;
  meId: string;
  mySeats: Seat[];
  isMinimal: boolean;
  nameById: (id?: string) => string;
  onSeatSide: (side: 'w' | 'b') => void;
  onRelease: () => void;
};

function SeatButton({
  label,
  seat,
  takenBy,
  onPress,
  disabled,
  nameById,
  meId,
}: {
  label: string;
  seat: Seat;
  takenBy?: string;
  onPress: () => void;
  disabled?: boolean;
  nameById: (id?: string) => string;
  meId: string;
}) {
  const occupant = takenBy ? ` • ${takenBy === meId ? 'you' : nameById(takenBy)}` : '';
  return <Button title={`${label}${occupant}`} onPress={onPress} disabled={disabled} />;
}

export function SeatControls({ room, meId, mySeats, isMinimal, nameById, onSeatSide, onRelease }: SeatControlsProps) {
  if (isMinimal) return null;

  const seatIds = (room.mode === '1v1' ? ['w1', 'b1'] : ['w1', 'w2', 'b1', 'b2']) as Seat[];

  return (
    <Card style={{ marginBottom: 12, gap: 8 }}>
      <Text>Seats</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Button title="Join White" disabled={!!room.seats['w1'] && room.seats['w1'] !== meId} onPress={() => onSeatSide('w')} />
        <Button title="Join Black" disabled={!!room.seats['b1'] && room.seats['b1'] !== meId} onPress={() => onSeatSide('b')} />
        {mySeats.length > 0 && <Button title="Release Seat" onPress={onRelease} />}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {seatIds.map((seat) => (
          <SeatButton
            key={seat}
            label={seat}
            seat={seat}
            takenBy={room.seats[seat]}
            nameById={nameById}
            meId={meId}
            disabled
            onPress={() => {}}
          />
        ))}
      </View>
    </Card>
  );
}
