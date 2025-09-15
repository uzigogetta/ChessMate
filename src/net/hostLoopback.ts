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
        phase: 'LOBBY',
        version: 0,
        result: undefined,
        pending: undefined,
        hostId: meId,
        heartbeats: { [meId]: Date.now() }
      };
      rooms.set(roomId, r);
    } else {
      if (!r.members.find((m) => m.id === meId)) r.members.push(this.me);
      r.mode = mode;
    }
    // Auto-seat policy for 1v1: first joiner takes White if free
    if (r.mode === '1v1') {
      const alreadySeated = Object.values(r.seats).includes(meId);
      if (!alreadySeated) {
        if (!r.seats['w1'] && !r.seats['b1']) {
          r.seats['w1'] = meId; // first joiner gets White
        } else if (r.seats['w1'] && !r.seats['b1']) {
          r.seats['b1'] = meId; // second joiner gets Black
        } else if (!r.seats['w1'] && r.seats['b1']) {
          r.seats['w1'] = meId;
        }
      }
    }
    this.maybeStart(r);
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
      // don't steal an occupied seat owned by someone else
      const occupant = r.seats[seat];
      if (occupant && occupant !== this.me.id) {
        return;
      }
      // release any previous seats for me
      for (const k of Object.keys(r.seats) as Seat[]) if (r.seats[k] === this.me.id) delete r.seats[k];
      r.seats[seat] = this.me.id;
    }
    this.maybeStart(r);
    this.emitState();
  }

  seatSide(side: 'w' | 'b'): void {
    const r = this.getRoom();
    if (!r || !this.me) return;
    const order: Seat[] = side === 'w' ? ['w1', 'w2'] : ['b1', 'b2'];
    // if I already sit on this side, keep it
    for (const s of order) {
      if (r.seats[s] === this.me.id) {
        this.emitState();
        return;
      }
    }
    const candidates = r.mode === '1v1' ? [order[0]] : order;
    const free = candidates.find((s) => !r.seats[s]);
    if (!free) {
      // side full; do not release current seat
      this.emitState();
      return;
    }
    // move: release my seats then claim the free seat on requested side
    for (const k of Object.keys(r.seats) as Seat[]) if (r.seats[k] === this.me.id) delete r.seats[k];
    r.seats[free] = this.me.id;
    this.maybeStart(r);
    this.emitState();
  }

  releaseSeat(): void {
    const r = this.getRoom();
    if (!r || !this.me) return;
    for (const k of Object.keys(r.seats) as Seat[]) if (r.seats[k] === this.me.id) delete r.seats[k];
    this.emitState();
  }

  start(): void {
    const r = this.getRoom();
    if (!r || !this.me) return;
    if (r.started) return;
    // only host can start
    if (r.hostId !== this.me.id) return;
    r.started = true;
    r.phase = 'ACTIVE';
    r.startedAt = Date.now();
    // ensure driver is white at start
    r.driver = 'w';
    r.version = (r.version || 0) + 1;
    this.emitState();
  }

  restart?(): void {
    const r = this.getRoom();
    if (!r || !this.me) return;
    if (r.hostId !== this.me.id) return;
    const c = new Chess();
    r.started = true;
    r.phase = 'ACTIVE';
    r.startedAt = Date.now();
    r.result = undefined;
    r.pending = undefined;
    r.fen = c.fen();
    r.historySAN = [];
    r.driver = 'w';
    r.version = (r.version || 0) + 1;
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
    if (r.result) return; // game over
    const c = new Chess(r.fen);
    const mv = c.move(san, { sloppy: true } as any);
    if (!mv) return;
    r.fen = c.fen();
    r.historySAN.push(mv.san);
    r.driver = r.driver === 'w' ? 'b' : 'w';
    r.version = (r.version || 0) + 1;
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
    r.version = (r.version || 0) + 1;
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

  // Step 8: action protocol (loopback applies immediately)
  requestUndo(): void {
    const r = this.getRoom();
    if (!r || r.historySAN.length === 0 || r.result) return;
    this.undo();
  }

  resign(): void {
    const r = this.getRoom();
    if (!r || !this.me || r.result) return;
    const myId = this.me.id;
    const mySide: 'w' | 'b' | null = r.seats['w1'] === myId || r.seats['w2'] === myId ? 'w' : (r.seats['b1'] === myId || r.seats['b2'] === myId ? 'b' : null);
    if (!mySide) return;
    r.result = mySide === 'w' ? '0-1' : '1-0';
    r.phase = 'RESULT';
    r.finishedAt = Date.now();
    r.version = (r.version || 0) + 1;
    this.emitState();
  }

  offerDraw(): void {
    const r = this.getRoom();
    if (!r || !this.me || r.result) return;
    r.pending = { ...(r.pending || {}), drawFrom: this.me.id } as any;
    r.version = (r.version || 0) + 1;
    this.emitState();
  }

  answerDraw(accept: boolean): void {
    const r = this.getRoom();
    if (!r || !this.me || !r.pending) return;
    if (!accept) {
      r.pending = undefined;
      this.emitState();
      return;
    }
    r.result = '1/2-1/2';
    r.phase = 'RESULT';
    r.finishedAt = Date.now();
    r.pending = undefined;
    r.version = (r.version || 0) + 1;
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

  private maybeStart(r: Room) {
    if (!r.started && r.mode === '1v1' && !!r.seats['w1'] && !!r.seats['b1']) {
      r.started = true;
      r.driver = 'w';
    }
  }
}


