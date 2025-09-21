import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useRoomStore } from '@/features/online/room.store';
import { flushOutbox } from '@/shared/cloud';

export function ReconnectListener() {
	const getState = useRoomStore;
	const joiningRef = useRef<boolean>(false);
	useEffect(() => {
		const sub = NetInfo.addEventListener(async (state) => {
			const online = !!state.isConnected;
			const room = getState.getState().room;
			if (online) {
				// Drain queued cloud uploads
				flushOutbox().catch(() => {});
				// Debounce join to avoid races when toggling connectivity
				if (room && !joiningRef.current) {
					joiningRef.current = true;
					try {
						await getState.getState().join(room.roomId, room.mode, getState.getState().me.name);
					} finally {
						setTimeout(() => { joiningRef.current = false; }, 500);
					}
				}
			}
		});
		return () => sub && sub();
	}, []);
	return null;
}


