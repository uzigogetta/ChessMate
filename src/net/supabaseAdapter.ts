import { Chess } from 'chess.js';
import { logReq, logRt, logState, logMove } from '@/debug/netLogger';
import type { Mode, NetAdapter, NetEvents, Player, RoomState, Seat } from './types';
import { supabase } from './supabaseClient';

type BroadcastEvent =
  | { type: 'room/state'; state: RoomState }
  | { type: 'chat/msg'; from: string; txt: string }
  | { type: 'game/move'; from: string; san: string; fen: string }
  | { type: 'room/req'; from: string; req: any }
  | { type: 'room/ack'; to: string; ok: boolean; reason?: string; snapshot?: RoomState };

export class SupabaseRealtimeAdapter implements NetAdapter {
  private me: Player | null = null;
  private roomId: string | null = null;
  private handler: ((e: NetEvents) => void) | null = null;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private state: RoomState | null = null;
  private lastPresenceCount = 0;
  private hostId: string | null = null;
  private isHost = false;
  private lastSeen: Record<string, number> = {};
  private pruneTimer: any = null;
  private currentMembers: Set<string> = new Set();

  async join(roomId: string, mode: Mode, name: string, id: string): Promise<void> {
    this.me = { id, name };
    this.roomId = roomId;
    const c = new Chess();
    this.state = {
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
      pending: undefined
    };

    // Create channel with presence keyed by player id and enable self-broadcasts
    this.channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: id }, broadcast: { self: true } as any }
    });

    // Presence sync -> rebuild members; host assigns seats and re-broadcasts authoritative state
    this.channel.on('presence', { event: 'sync' }, () => {
      if (!this.channel || !this.state) return;
      const presenceState = this.channel.presenceState() as Record<string, { name?: string }[]>;
      const memberIds = Object.keys(presenceState);
      const now = Date.now();
      this.currentMembers = new Set(memberIds);
      memberIds.forEach((id) => (this.lastSeen[id] = now));
      const members: Player[] = memberIds.map((pid) => ({ id: pid, name: presenceState[pid][0]?.name || 'Guest' }));
      this.state.members = members;
      // elect host by smallest id on first sync; keep sticky unless host leaves
      const sorted = memberIds.slice().sort();
      if (!this.hostId || (this.hostId && !memberIds.includes(this.hostId))) {
        this.hostId = sorted[0] || null;
      }
      this.isHost = !!(this.me && this.hostId && this.me.id === this.hostId);
      if (this.isHost) {
        // Assign seats deterministically in 1v1 (no immediate pruning; handled by grace timer)
        if (this.state.mode === '1v1') {
          const seats = this.state.seats;
          // If both empty, set host as White and next joined as Black
          if (!seats['w1'] && !seats['b1'] && this.hostId) {
            seats['w1'] = this.hostId;
            const otherId = memberIds.find((id) => id !== this.hostId) || null;
            if (otherId) seats['b1'] = otherId;
          }
          // If White missing, assign to host
          if (!seats['w1'] && this.hostId) seats['w1'] = this.hostId;
          // If Black missing and there is another member, assign without stealing
          if (!seats['b1']) {
            const candidate = memberIds.find((id) => id !== seats['w1']);
            if (candidate) seats['b1'] = candidate;
          }
        }
        // Bump version so clients don't ignore this update as stale
        this.state.version = (this.state.version || 0) + 1;
        logState('host emit room/state', this.state);
        this.broadcast({ type: 'room/state', state: this.state });
        this.schedulePrune();
      }
      this.emitState();
      this.lastPresenceCount = memberIds.length;
    });
    // Request channel
    this.channel.on('broadcast', { event: 'room/req' }, (payload: any) => {
      if (!this.isHost || !this.state) return;
      const { from, req } = payload?.payload || payload || {};
      if (!from || !req) return;
      const seats = this.state.seats;
      const bump = () => { this.state!.version = (this.state!.version || 0) + 1; };
      const clearPending = () => { this.state!.pending = undefined; };

      if (req.kind === 'seat') {
        const side: 'w' | 'b' = req.side;
        const order: Seat[] = side === 'w' ? ['w1'] : ['b1'];
        const target = order.find((s) => !seats[s] || seats[s] === from);
        if (!target) {
          this.broadcast({ type: 'room/ack', to: from, ok: false, reason: 'Side full' });
          return;
        }
        // release from's previous seats
        (Object.keys(seats) as Seat[]).forEach((s) => { if (seats[s] === from) delete seats[s]; });
        seats[target] = from;
        bump(); this.syncState();
        this.broadcast({ type: 'room/ack', to: from, ok: true, snapshot: this.state });
      } else if (req.kind === 'release') {
        (Object.keys(seats) as Seat[]).forEach((s) => { if (seats[s] === from) delete seats[s]; });
        bump(); this.syncState();
        this.broadcast({ type: 'room/ack', to: from, ok: true, snapshot: this.state });
      } else if (req.kind === 'start') {
        if (this.state.phase === 'LOBBY') {
          this.state.started = true;
          this.state.phase = 'ACTIVE';
          this.state.startedAt = Date.now();
          this.state.driver = 'w';
          bump(); this.syncState();
        }
      } else if (req.kind === 'moveSAN') {
        if (this.state.phase !== 'ACTIVE') return;
        const c = new Chess(this.state.fen);
        const mv = c.move(req.san, { sloppy: true } as any);
        if (!mv) return;
        this.state.fen = c.fen();
        this.state.historySAN = [...this.state.historySAN, mv.san];
        clearPending();
        bump();
        this.broadcast({ type: 'game/move', from: from, san: mv.san, fen: this.state.fen });
        this.state.driver = c.turn() as 'w' | 'b';
        // Terminal detection could be added here later
        this.syncState();
      } else if (req.kind === 'undoReq') {
        if (this.state.phase !== 'ACTIVE') return;
        const prev = this.state.pending || {};
        this.state.pending = { ...prev, undoFrom: from } as any;
        bump(); this.syncState();
      } else if (req.kind === 'undoAnswer') {
        if (this.state.phase !== 'ACTIVE' || !this.state.pending?.undoFrom) return;
        if (req.accept) {
          if (this.state.historySAN.length > 0) {
            this.state.historySAN = this.state.historySAN.slice(0, -1);
            const c = new Chess();
            for (const s of this.state.historySAN) c.move(s, { sloppy: true } as any);
            this.state.fen = c.fen();
            this.state.driver = c.turn() as 'w' | 'b';
          }
        }
        const p = this.state.pending || {};
        delete (p as any).undoFrom;
        this.state.pending = Object.keys(p).length ? (p as any) : undefined;
        bump(); this.syncState();
      } else if (req.kind === 'resign') {
        if (this.state.phase !== 'ACTIVE') return;
        const side = this.seatOf(from);
        if (!side) return;
        this.state.result = side === 'w' ? '0-1' : '1-0';
        this.state.phase = 'RESULT';
        this.state.finishedAt = Date.now();
        clearPending();
        bump(); this.syncState();
        this.broadcast({ type: 'room/ack', to: from, ok: true, snapshot: this.state });
      } else if (req.kind === 'drawOffer') {
        if (this.state.phase !== 'ACTIVE') return;
        const prev = this.state.pending || {};
        this.state.pending = { ...prev, drawFrom: from } as any;
        bump(); this.syncState();
        // no-op ack; authoritative room/state just emitted
      } else if (req.kind === 'drawAnswer') {
        if (this.state.phase !== 'ACTIVE' || !this.state.pending?.drawFrom) return;
        if (req.accept) {
          this.state.result = '1/2-1/2';
          this.state.phase = 'RESULT';
          this.state.finishedAt = Date.now();
        }
        clearPending();
        bump(); this.syncState();
        // no-op ack; authoritative room/state just emitted
      } else if (req.kind === 'restart') {
        if (this.state.phase !== 'RESULT' && this.state.phase !== 'LOBBY') return;
        const prev = this.state.pending || {};
        this.state.pending = { ...prev, restartFrom: from } as any;
        bump(); this.syncState();
      } else if (req.kind === 'restartAnswer') {
        if (!this.state.pending?.restartFrom) return;
        if (req.accept) {
          const c = new Chess();
          this.state.result = undefined;
          this.state.fen = c.fen();
          this.state.historySAN = [];
          this.state.driver = 'w';
          this.state.started = true;
          this.state.phase = 'ACTIVE';
          this.state.startedAt = Date.now();
        }
        const p = this.state.pending || {};
        delete (p as any).restartFrom;
        this.state.pending = Object.keys(p).length ? (p as any) : undefined;
        bump(); this.syncState();
      }
    });

    // Broadcast listeners
    this.channel.on('broadcast', { event: 'room/state' }, (payload: any) => {
      logRt('broadcast room/state', payload);
      const incoming: RoomState = payload?.payload?.state || payload?.state;
      if (!incoming) return;
      // Version guard: ignore stale snapshots (important during reconnection)
      if (this.state && typeof incoming.version === 'number' && typeof this.state.version === 'number' && incoming.version < this.state.version) {
        return;
      }
      // Merge presence-derived members for accuracy
      if (this.channel) {
        const presenceState = this.channel.presenceState() as Record<string, { name?: string }[]>;
        incoming.members = Object.keys(presenceState).map((pid) => ({ id: pid, name: presenceState[pid][0]?.name || 'Guest' }));
      }
      // Replace local snapshot immutably
      this.state = {
        ...incoming,
        seats: { ...incoming.seats },
        members: [...incoming.members]
      };
      this.handler?.({ t: 'room/state', state: this.state });
    });

    this.channel.on('broadcast', { event: 'chat/msg' }, (payload: any) => {
      logRt('broadcast chat/msg', payload);
      const { from, txt } = payload?.payload || payload || {};
      if (!from || typeof txt !== 'string') return;
      this.handler?.({ t: 'chat/msg', from, txt });
    });

    this.channel.on('broadcast', { event: 'game/move' }, (payload: any) => {
      logRt('broadcast game/move', payload);
      const { from, san, fen } = payload?.payload || payload || {};
      if (!san || !fen) return;
      if (this.state) {
        this.state.fen = fen;
        this.state.historySAN = [...this.state.historySAN, san];
        const c = new Chess(fen);
        this.state.driver = c.turn() as 'w' | 'b';
      }
      this.handler?.({ t: 'game/move', from: from || this.me?.id || 'peer', san, fen });
    });

    this.channel.on('broadcast', { event: 'room/ack' }, (payload: any) => {
      const { to, ok, snapshot } = payload?.payload || payload || {};
      if (!to || !ok) return;
      if (this.me && to === this.me.id && snapshot) {
        // Apply snapshot locally for immediate UI feedback
        this.state = { ...snapshot, seats: { ...snapshot.seats }, members: [...snapshot.members] };
        this.emitState();
      }
    });

    // Subscribe & announce presence, share local state to seed peers
    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // announce presence with name
        await this.channel?.track({ name });
        // If I'm host and seats are empty, auto-seat me as White immediately to avoid initial spectator state
        if (this.isHost && this.state) {
          const seats = this.state.seats;
          if (!seats['w1']) {
            seats['w1'] = this.me!.id;
            this.state.version = (this.state.version || 0) + 1;
            this.broadcast({ type: 'room/state', state: this.state });
          }
        }
        this.emitState();
      }
    });
  }

  leave(): void {
    this.channel?.unsubscribe();
    this.channel = null;
    this.state = null;
    this.me = null;
    this.roomId = null;
  }

  seat(seat: Seat | null): void {
    if (!this.state || !this.me) return;
    if (!this.isHost) return; // non-hosts don't mutate authoritative state
    const meId = this.me.id;
    // 1v1 restrict
    if (this.state.mode === '1v1' && seat && (seat === 'w2' || seat === 'b2')) return;
    // if selecting a seat that is already taken by someone else, ignore
    if (seat && this.state.seats[seat] && this.state.seats[seat] !== meId) return;
    // release previous seats occupied by me
    for (const k of Object.keys(this.state.seats) as Seat[]) if (this.state.seats[k] === meId) delete this.state.seats[k];
    if (seat) this.state.seats[seat] = meId;
    this.syncState();
  }

  seatSide(side: 'w' | 'b'): void {
    if (!this.state || !this.me) return;
    if (!this.isHost) {
      // Request host to seat me on this side
      this.broadcast({ type: 'room/req', from: this.me.id, req: { kind: 'seat', side } });
      return;
    }
    const order: Seat[] = side === 'w' ? ['w1', 'w2'] : ['b1', 'b2'];
    const candidates = this.state.mode === '1v1' ? [order[0]] : order;
    const meId = this.me.id;
    let target: Seat | null = null;
    for (const s of candidates) {
      if (!this.state.seats[s] || this.state.seats[s] === meId) {
        target = s;
        break;
      }
    }
    for (const k of Object.keys(this.state.seats) as Seat[]) if (this.state.seats[k] === meId) delete this.state.seats[k];
    if (target) this.state.seats[target] = meId;
    this.syncState();
  }

  releaseSeat(): void {
    if (!this.state || !this.me) return;
    if (!this.isHost) {
      this.broadcast({ type: 'room/req', from: this.me.id, req: { kind: 'release' } });
      return;
    }
    for (const k of Object.keys(this.state.seats) as Seat[]) if (this.state.seats[k] === this.me.id) delete this.state.seats[k];
    this.syncState();
  }

  start(): void {
    if (!this.state) return;
    // If I'm not the host, request the host to start the game
    if (!this.isHost) {
      this.broadcast({ type: 'room/req', from: this.me?.id || 'me', req: { kind: 'start' } });
      return;
    }
    // Host: transition to ACTIVE and bump version so clients don't drop the update
    if (this.state.phase !== 'ACTIVE') {
      this.state.started = true;
      this.state.phase = 'ACTIVE';
      this.state.startedAt = Date.now();
      this.state.driver = 'w';
      this.state.version = (this.state.version || 0) + 1;
    }
    this.syncState();
  }

  toggleReady?(): void {}

  passBaton(): void {
    // For now: broadcast state to notify peers; baton behavior is UI-local
    this.syncState();
  }

  moveSAN(san: string): void {
    if (!this.state || !this.me) return;
    if (this.state.result) return;
    // Only allow moves for the side to move
    const seats = this.state.seats;
    const myId = this.me.id;
    const mySide: 'w' | 'b' | null = (seats['w1'] === myId || seats['w2'] === myId) ? 'w' : (seats['b1'] === myId || seats['b2'] === myId) ? 'b' : null;
    if (!mySide || mySide !== this.state.driver) return;
    const c = new Chess(this.state.fen);
    const mv = c.move(san, { sloppy: true } as any);
    if (!mv) return;

    if (this.isHost) {
      // Host applies move, broadcasts move, bumps version, and syncs state
      this.state.fen = c.fen();
      this.state.historySAN.push(mv.san);
      this.state.driver = this.state.driver === 'w' ? 'b' : 'w';
      this.broadcast({ type: 'game/move', from: this.me?.id || 'peer', san: mv.san, fen: this.state.fen });
      this.state.version = (this.state.version || 0) + 1;
      this.syncState();
    } else {
      // Non-host: request host to apply. Do not broadcast game/move directly to avoid echo issues.
      // For responsiveness, we can rely on host's game/move broadcast shortly after.
      this.broadcast({ type: 'room/req', from: this.me.id, req: { kind: 'moveSAN', san: mv.san } });
    }
  }

  sendChat?(txt: string): void {
    if (!txt) return;
    this.broadcast({ type: 'chat/msg', from: this.me?.id || 'me', txt });
  }

  requestUndo(): void {
    this.broadcast({ type: 'room/req', from: this.me?.id || 'me', req: { kind: 'undoReq' } });
  }

  answerUndo(accept: boolean): void {
    this.broadcast({ type: 'room/req', from: this.me?.id || 'me', req: { kind: 'undoAnswer', accept } });
  }

  resign(): void {
    this.broadcast({ type: 'room/req', from: this.me?.id || 'me', req: { kind: 'resign' } });
  }

  offerDraw(): void {
    this.broadcast({ type: 'room/req', from: this.me?.id || 'me', req: { kind: 'drawOffer' } });
  }

  answerDraw(accept: boolean): void {
    this.broadcast({ type: 'room/req', from: this.me?.id || 'me', req: { kind: 'drawAnswer', accept } });
  }

  heartbeat?(): void {}

  restart?(): void {
    this.broadcast({ type: 'room/req', from: this.me?.id || 'me', req: { kind: 'restart' } });
  }

  answerRestart(accept: boolean): void {
    this.broadcast({ type: 'room/req', from: this.me?.id || 'me', req: { kind: 'restartAnswer', accept } });
  }

  onEvent(handler: (e: NetEvents) => void): void {
    this.handler = handler;
    this.emitState();
  }

  private emitState() {
    if (this.state) {
      // Send a new object reference so Zustand selectors pick up changes on the sender
      const stateCopy: RoomState = {
        ...this.state,
        seats: { ...this.state.seats },
        members: [...this.state.members]
      };
      this.handler?.({ t: 'room/state', state: stateCopy });
    }
  }

  private broadcast(e: BroadcastEvent) {
    this.channel?.send({ type: 'broadcast', event: e.type, payload: e });
  }

  private syncState() {
    if (!this.state) return;
    // Only host broadcasts authoritative state
    if (this.isHost) this.broadcast({ type: 'room/state', state: this.state });
    this.emitState();
  }

  private schedulePrune() {
    if (!this.isHost) return;
    if (this.pruneTimer) return;
    const GRACE_MS = 15000;
    this.pruneTimer = setInterval(() => {
      if (!this.state) return;
      const now = Date.now();
      let changed = false;
      (['w1','b1','w2','b2'] as Seat[]).forEach((s) => {
        const pid = this.state!.seats[s];
        // Only prune if the occupant is no longer in current presence and grace elapsed
        if (pid && !this.currentMembers.has(pid) && this.lastSeen[pid] && now - this.lastSeen[pid] > GRACE_MS) {
          delete this.state!.seats[s];
          changed = true;
        }
      });
      if (changed) this.syncState();
    }, 5000);
  }
}


