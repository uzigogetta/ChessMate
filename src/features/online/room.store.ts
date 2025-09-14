import { create } from 'zustand';
import type { Mode, NetAdapter, NetEvents, Player, RoomState, Seat } from '@/net/types';
import { createNet } from '@/net';
import { getJSON, setJSON, KEYS } from '@/features/storage/mmkv';

type State = {
  me: Player;
  room?: RoomState;
  net: NetAdapter;
  join: (roomId: string, mode: Mode, name?: string) => Promise<void>;
  leave: () => void;
  takeSeat: (seat: Seat | null) => void;
  start: () => void;
  passBaton: () => void;
  moveSAN: (san: string) => void;
};

function randomId(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const useRoomStore = create<State>((set, get) => ({
  me: (getJSON<Player>(KEYS.lastIdentity) || { id: randomId(6), name: 'Me' }) as Player,
  net: createNet(),
  async join(roomId, mode, name) {
    const me = { ...get().me, name: name || get().me.name };
    // Always resolve a fresh adapter on join (ensures correct HostLoopback vs Socket selection)
    const net = createNet();
    set({ me, net, room: undefined });
    setJSON(KEYS.lastIdentity, me);
    net.onEvent((e: NetEvents) => {
      if (e.t === 'room/state') {
        set({ room: e.state });
        setJSON(KEYS.lastRoomState, {
          roomId: e.state.roomId,
          fen: e.state.fen,
          historySAN: e.state.historySAN,
          seats: e.state.seats,
          lastUpdated: Date.now()
        });
      }
    });
    await net.join(roomId, mode, me.name, me.id);
  },
  leave() {
    get().net.leave();
    set({ room: undefined });
  },
  takeSeat(seat) {
    get().net.seat(seat);
  },
  start() {
    get().net.start();
  },
  passBaton() {
    get().net.passBaton();
  },
  moveSAN(san) {
    get().net.moveSAN(san);
  }
}));


