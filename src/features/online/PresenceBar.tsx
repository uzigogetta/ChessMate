import React from 'react';
import { View, Text } from 'react-native';
import type { Player, Seat } from '@/net/types';

type Props = {
  members: Player[];
  seats: Partial<Record<Seat, string>>;
  myId: string;
  activeTeammate?: string | null;
  mode: '1v1' | '2v2';
};

function Initial({ name, color, active, me }: { name: string; color: string; active?: boolean; me?: boolean }) {
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?';
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
        marginRight: 6,
        shadowColor: active ? '#00E0B8' : 'transparent',
        shadowOpacity: active ? 0.9 : 0,
        shadowRadius: active ? 6 : 0
      }}
    >
      <Text style={{ color: '#0A0A0A', fontWeight: '700', fontSize: 12 }}>{initial}</Text>
      {me && (
        <View style={{ position: 'absolute', right: -2, bottom: -2, backgroundColor: '#7b61ff', borderRadius: 6, paddingHorizontal: 3, paddingVertical: 1 }}>
          <Text style={{ color: 'white', fontSize: 9 }}>you</Text>
        </View>
      )}
    </View>
  );
}

function SeatBubble({ label, occupant, members, myId, active }: { label: string; occupant?: string; members: Player[]; myId: string; active?: boolean }) {
  const name = occupant ? members.find((m) => m.id === occupant)?.name || '—' : '';
  const color = occupant ? '#EEE' : 'transparent';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
      <View style={{ width: 22, alignItems: 'center', marginRight: 4 }}>
        <Text style={{ color: '#999', fontSize: 11 }}>{label}</Text>
      </View>
      {occupant ? (
        <Initial name={name} color={color} active={active} me={occupant === myId} />
      ) : (
        <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: '#444', marginRight: 6 }} />
      )}
    </View>
  );
}

export function PresenceBar({ members, seats, myId, activeTeammate, mode }: Props) {
  const showW2 = mode === '2v2';
  const showB2 = mode === '2v2';
  return (
    <View style={{ width: '100%', paddingVertical: 6, paddingHorizontal: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SeatBubble label="w1" occupant={seats['w1']} members={members} myId={myId} active={activeTeammate ? activeTeammate === seats['w1'] : false} />
          {showW2 && <SeatBubble label="w2" occupant={seats['w2']} members={members} myId={myId} active={activeTeammate ? activeTeammate === seats['w2'] : false} />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SeatBubble label="b1" occupant={seats['b1']} members={members} myId={myId} active={activeTeammate ? activeTeammate === seats['b1'] : false} />
          {showB2 && <SeatBubble label="b2" occupant={seats['b2']} members={members} myId={myId} active={activeTeammate ? activeTeammate === seats['b2'] : false} />}
        </View>
      </View>
    </View>
  );
}

export default PresenceBar;


