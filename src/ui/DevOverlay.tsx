import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoomStore } from '@/features/online/room.store';
import { getTurn } from '@/features/chess/logic/moveHelpers';

export function DevOverlay() {
  const room = useRoomStore((s) => s.room);
  const myId = useRoomStore((s) => s.me.id);

  if (!__DEV__) return null;
  if (!room) return null;

  const mySeats = Object.entries(room.seats ?? {})
    .filter(([_, id]) => id === myId)
    .map(([seat]) => seat);
  const mySide = (mySeats[0]?.[0] as 'w' | 'b' | undefined) || undefined;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Text style={styles.line}>{`fen: ${room.fen.slice(0, 20)}...`}</Text>
      <Text style={styles.line}>{`turn: ${getTurn(room.fen)}`}</Text>
      <Text style={styles.line}>{`mySide: ${mySide ?? '—'}`}</Text>
      <Text style={styles.line}>{`isMyTurn: ${room.started && mySide === getTurn(room.fen) ? '✅' : '❌'}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 10,
    right: 10,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6
  },
  line: { color: '#fff', fontSize: 12 }
});


