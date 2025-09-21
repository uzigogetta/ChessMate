import React from 'react';
import { View } from 'react-native';
import { Card, Text, Button } from '@/ui/atoms';
import PresenceBar from '@/features/online/PresenceBar';
import type { RoomState } from '@/net/types';

type Props = {
  room: RoomState;
  mySide: 'w' | 'b' | null;
  isMyTurn: boolean;
  meId: string;
  copied: boolean;
  onCopyId: () => void;
  onInvite: () => void;
};

export function RoomHeader({ room, mySide, isMyTurn, meId, copied, onCopyId, onInvite }: Props) {
  const driverLabel = room.driver === 'w' ? 'White' : 'Black';
  const mySeatLabel = mySide ? (mySide === 'w' ? 'White' : 'Black') : 'Spectator';

  return (
    <Card style={{ marginBottom: 12 }}>
      <Text>{isMyTurn ? 'Your turn' : `${driverLabel} to move`}</Text>
      <Text muted>{`Room ${room.roomId} • You: ${mySeatLabel} • ${room.members.length} players`}</Text>
      <PresenceBar members={room.members} seats={room.seats} myId={meId} activeTeammate={null} mode={room.mode} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button title="Invite" onPress={onInvite} />
        <Button
          title={copied ? 'Copied!' : 'Copy ID'}
          disabled={copied}
          variant={copied ? 'success' : 'primary'}
          onPress={onCopyId}
        />
      </View>
    </Card>
  );
}
