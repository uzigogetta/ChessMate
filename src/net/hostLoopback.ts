import { Chess } from 'chess.js';
import type { Mode, NetAdapter, NetEvents, Player, RoomState, Seat } from './types';

type Room = RoomState & { hostId: string };

// Tiny in-memory event bus (RN-friendly, no Node stdlib)
type Handler = (e: NetEvents) => void;
const subscribers = new Set<Handler>();
const subscribe = (h: Handler) => subscribers.add(h);
const publish = (e: NetEvents) => subscribers.forEach((h) => h(e));
const rooms = new Map<string, Room>();

function randomId(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export class HostLoopback implements NetAdapter {
  private me: Player | null = null;
  private roomId: string | null = null;
  private handler: ((e: NetEvents) => void) | null = null;

  async join(roomId: string, mode: Mode, name: string, id: string): Promise<void> {
    const meId = id || randomId(8);
    this.me = { id: meId, name };
    this.roomId = roomId;
    let r = rooms.get(roomId);
    if (!r) {
      const c = new Chess();
      r = {
        roomId,
        mode,
        members: [this.me],
        seats: {},
        driver: 'w',
        fen: c.fen(),
        historySAN: [],
        started: false,
        hostId: meId,
        heartbeats: { [meId]: Date.now() }
      };
      rooms.set(roomId, r);
    } else {
      if (!r.members.find((m) => m.id === meId)) r.members.push(this.me);
      r.mode = mode;
    }
    this.emitState();
  }

  leave(): void {
    if (!this.roomId) return;
    const r = rooms.get(this.roomId);
    if (r && this.me) {
      r.members = r.members.filter((m) => m.id !== this.me!.id);
      for (const k of Object.keys(r.seats) as Seat[]) {
        if (r.seats[k] === this.me.id) delete r.seats[k];
      }
      this.emitState();
    }
    this.me = null;
    this.roomId = null;
  }

  seat(seat: Seat | null): void {
    const r = this.getRoom();
    if (!r || !this.me) return;
    if (seat == null) {
      for (const k of Object.keys(r.seats) as Seat[]) if (r.seats[k] === this.me.id) delete r.seats[k];
    } else {
      // 1v1 restrict to w1/b1
      if (r.mode === '1v1' && (seat === 'w2' || seat === 'b2')) return;
      // release any previous seats for me
      for (const k of Object.keys(r.seats) as Seat[]) if (r.seats[k] === this.me.id) delete r.seats[k];
      r.seats[seat] = this.me.id;
    }
    this.emitState();
  }

  start(): void {
    const r = this.getRoom();
    if (!r || !this.me) return;
    if (r.started) return;
    // only host can start
    if (r.hostId !== this.me.id) return;
    r.started = true;
    // ensure driver is white at start
    r.driver = 'w';
    this.emitState();
  }

  toggleReady?(): void {}

  passBaton(): void {
    const r = this.getRoom();
    if (!r || !this.me) return;
    // no-op for now: baton is local preference. State broadcast already enough.
    this.emitState();
  }

  moveSAN(san: string): void {
    const r = this.getRoom();
    if (!r) return;
    const c = new Chess(r.fen);
    const mv = c.move(san, { sloppy: true } as any);
    if (!mv) return;
    r.fen = c.fen();
    r.historySAN.push(mv.san);
    r.driver = r.driver === 'w' ? 'b' : 'w';
    this.broadcast({ t: 'game/move', from: this.me?.id || 'host', san: mv.san, fen: r.fen });
    this.emitState();
  }

  undo(): void {
    const r = this.getRoom();
    if (!r) return;
    // soft undo: pop last SAN and recompute
    r.historySAN = r.historySAN.slice(0, -1);
    const c = new Chess();
    for (const s of r.historySAN) c.move(s, { sloppy: true } as any);
    r.fen = c.fen();
    r.driver = c.turn();
    this.emitState();
  }

  sendChat(txt: string): void {
    if (!this.me) return;
    this.broadcast({ t: 'chat/msg', from: this.me.id, txt });
  }

  heartbeat(): void {
    const r = this.getRoom();
    if (!r || !this.me) return;
    if (!r.heartbeats) r.heartbeats = {} as any;
    r.heartbeats[this.me.id] = Date.now();
    this.emitState();
  }

  onEvent(handler: (e: NetEvents) => void): void {
    this.handler = handler;
    subscribe(handler);
    this.emitState();
  }

  private getRoom(): Room | null {
    if (!this.roomId) return null;
    return rooms.get(this.roomId) || null;
  }

  private emitState() {
    const r = this.getRoom();
    if (!r) return;
    const { hostId, ...state } = r;
    this.broadcast({ t: 'room/state', state });
  }

  private broadcast(e: NetEvents) {
    publish(e);
  }
}


