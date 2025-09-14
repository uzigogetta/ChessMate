import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useRoomStore } from '@/features/online/room.store';

export function useReconnect() {
  const room = useRoomStore((s) => s.room);
  const me = useRoomStore((s) => s.me);
  const join = useRoomStore((s) => s.join);
  const wasOnline = useRef<boolean>(true);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected;
      if (!wasOnline.current && online && room) {
        join(room.roomId, room.mode, me.name);
      }
      wasOnline.current = online;
    });
    return () => sub && sub();
  }, [room?.roomId, room?.mode, me.name, join]);
}


