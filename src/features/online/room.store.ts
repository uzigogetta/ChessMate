import { create } from 'zustand';
import type { Mode, NetAdapter, NetEvents, Player, RoomState, Seat } from '@/net/types';
import { createNet } from '@/net';
import { logState, logMove } from '@/debug/netLogger';
import { sideToMove } from '@/features/chess/logic/chess.rules';
import { getJSON, setJSON, KEYS } from '@/features/storage/mmkv';
import { getPlayerId } from '@/core/identity';
import { useChatStore, type ChatMsg } from '@/features/chat/chat.store';

type State = {
  me: Player;
  room?: RoomState;
  net: NetAdapter;
  autoSeatedFor?: string;
  isMyTurn: () => boolean;
  readyToStart: () => boolean;
  join: (roomId: string, mode: Mode, name?: string) => Promise<void>;
  leave: () => void;
  takeSeat: (seat: Seat | null) => void;
  start: () => void;
  passBaton: () => void;
  moveSAN: (san: string) => void;
  resign: () => void;
  offerDraw: () => void;
};

function randomId(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const useRoomStore = create<State>((set, get) => ({
  me: (getJSON<Player>(KEYS.lastIdentity) || { id: getPlayerId(), name: `Player_${randomId(4)}` }) as Player,
  net: createNet(),
  autoSeatedFor: undefined,
  isMyTurn() {
    const r = get().room;
    if (!r) return false;
    const myId = get().me.id;
    const mySeats = (Object.keys(r.seats) as Seat[]).filter((k) => r.seats[k] === myId);
    const mySide = mySeats.some((s) => s.startsWith('w')) ? 'w' : mySeats.some((s) => s.startsWith('b')) ? 'b' : null;
    return !!r.started && !!mySide && mySide === r.driver;
  },
  readyToStart() {
    const r = get().room;
    if (!r) return false;
    if (r.mode === '1v1') return !!r.seats['w1'] && !!r.seats['b1'];
    const hasW = !!r.seats['w1'] || !!r.seats['w2'];
    const hasB = !!r.seats['b1'] || !!r.seats['b2'];
    return hasW && hasB;
  },
  async join(roomId, mode, name) {
    const me = { ...get().me, name: name || get().me.name };
    // Always resolve a fresh adapter on join (ensures correct HostLoopback vs Socket selection)
    const net = createNet();
    set({ me, net, room: undefined });
    setJSON(KEYS.lastIdentity, me);
    net.onEvent((e: NetEvents) => {
      if (e.t === 'room/state') {
        logState('store <- room/state', e.state);
        // Replace state directly; trust host. Avoid client-side re-seating to prevent flaps.
        const next = e.state;
        set({ room: next });
        setJSON(KEYS.lastRoomState, {
          roomId: next.roomId,
          fen: next.fen,
          historySAN: next.historySAN,
          seats: next.seats,
          lastUpdated: Date.now()
        });
        // no client auto-seat here to avoid races
      } else if (e.t === 'game/move') {
        logMove('store <- game/move', { san: e.san, fen: e.fen });
        const r = get().room;
        if (!r) return;
        const nextDriver = sideToMove(e.fen);
        const updated: RoomState = {
          ...r,
          fen: e.fen,
          historySAN: [...r.historySAN, e.san],
          driver: nextDriver
        };
        set({ room: updated });
        setJSON(KEYS.lastRoomState, {
          roomId: updated.roomId,
          fen: updated.fen,
          historySAN: updated.historySAN,
          seats: updated.seats,
          lastUpdated: Date.now()
        });
      } else if (e.t === 'chat/msg') {
        const r = get().room;
        if (!r) return;
        const msg: ChatMsg = { id: `${Date.now()}`, from: e.from, txt: e.txt, ts: Date.now() } as any;
        useChatStore.getState().append(r.roomId, msg);
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
  },
  resign() {
    const me = get().me;
    (get().net as any).sendChat?.(`[resign] ${me.name} resigned`);
  },
  offerDraw() {
    const me = get().me;
    (get().net as any).sendChat?.(`[draw] ${me.name} offers a draw`);
  }
}));


