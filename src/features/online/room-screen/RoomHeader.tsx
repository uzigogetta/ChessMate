import React from 'react';
import { View } from 'react-native';
import { Card, Text, Button } from '@/ui/atoms';
import PresenceBar from '@/features/online/PresenceBar';
import type { RoomState } from '@/net/types';
import { useReview } from '@/features/view/review.store';

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
  const livePlies = room.historySAN.length;
  const { plyIndex, goLive, pendingLiveCount } = useReview();
  const reviewing = plyIndex < livePlies;

  return (
    <Card style={{ marginBottom: 12 }}>
      <Text>{isMyTurn ? 'Your turn' : `${driverLabel} to move`}</Text>
      <Text muted>{`Room ${room.roomId} • You: ${mySeatLabel} • ${room.members.length} players`}</Text>
      <PresenceBar members={room.members} seats={room.seats} myId={meId} activeTeammate={null} mode={room.mode} />
      {reviewing && (
        <View style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#00000020', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text muted>Review mode</Text>
          <Text onPress={() => goLive(livePlies)} style={{ textDecorationLine: 'underline' }}>{pendingLiveCount > 0 ? `Go Live (+${pendingLiveCount})` : 'Go Live'}</Text>
        </View>
      )}
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
