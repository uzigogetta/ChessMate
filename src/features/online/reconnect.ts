import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useRoomStore } from '@/features/online/room.store';

export function ReconnectListener() {
  const roomId = useRoomStore((s) => s.room?.roomId);
  const mode = useRoomStore((s) => s.room?.mode);
  const name = useRoomStore((s) => s.me.name);
  const join = useRoomStore((s) => s.join);
  const wasOnline = useRef<boolean>(true);
  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected;
      if (!wasOnline.current && online && roomId && mode) {
        join(roomId, mode, name);
      }
      wasOnline.current = online;
    });
    return () => sub && sub();
  }, [roomId, mode, name, join]);
  return null;
}


