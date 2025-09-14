import { Chess } from 'chess.js';
import type { Mode, NetAdapter, NetEvents, Player, RoomState, Seat } from './types';
import { supabase } from './supabaseClient';

type BroadcastEvent =
  | { type: 'room/state'; state: RoomState }
  | { type: 'chat/msg'; from: string; txt: string }
  | { type: 'game/move'; from: string; san: string; fen: string };

export class SupabaseRealtimeAdapter implements NetAdapter {
  private me: Player | null = null;
  private roomId: string | null = null;
  private handler: ((e: NetEvents) => void) | null = null;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private state: RoomState | null = null;

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
      started: false
    };

    // Create channel with presence keyed by player id
    this.channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: id } }
    });

    // Presence sync -> rebuild members list from presence state
    this.channel.on('presence', { event: 'sync' }, () => {
      if (!this.channel || !this.state) return;
      const presenceState = this.channel.presenceState() as Record<string, { name?: string }[]>;
      const members: Player[] = Object.keys(presenceState).map((pid) => ({ id: pid, name: presenceState[pid][0]?.name || 'Guest' }));
      this.state.members = members;
      this.emitState();
    });

    // Broadcast listeners
    this.channel.on('broadcast', { event: 'room/state' }, (payload: any) => {
      const incoming: RoomState = payload?.payload?.state || payload?.state;
      if (!incoming) return;
      // Merge presence-derived members for accuracy
      if (this.channel) {
        const presenceState = this.channel.presenceState() as Record<string, { name?: string }[]>;
        incoming.members = Object.keys(presenceState).map((pid) => ({ id: pid, name: presenceState[pid][0]?.name || 'Guest' }));
      }
      this.state = incoming;
      this.handler?.({ t: 'room/state', state: this.state });
    });

    this.channel.on('broadcast', { event: 'chat/msg' }, (payload: any) => {
      const { from, txt } = payload?.payload || payload || {};
      if (!from || typeof txt !== 'string') return;
      this.handler?.({ t: 'chat/msg', from, txt });
    });

    this.channel.on('broadcast', { event: 'game/move' }, (payload: any) => {
      const { from, san, fen } = payload?.payload || payload || {};
      if (!san || !fen) return;
      this.handler?.({ t: 'game/move', from: from || this.me?.id || 'peer', san, fen });
    });

    // Subscribe & announce presence, share local state to seed peers
    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // track presence with name
        await this.channel?.track({ name });
        // emit my local state so newcomers can sync
        this.broadcast({ type: 'room/state', state: this.state! });
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
    // release previous seats occupied by me
    for (const k of Object.keys(this.state.seats) as Seat[]) if (this.state.seats[k] === this.me.id) delete this.state.seats[k];
    if (seat) this.state.seats[seat] = this.me.id;
    this.syncState();
  }

  start(): void {
    if (!this.state) return;
    this.state.started = true;
    this.state.driver = 'w';
    this.syncState();
  }

  toggleReady?(): void {}

  passBaton(): void {
    // For now: broadcast state to notify peers; baton behavior is UI-local
    this.syncState();
  }

  moveSAN(san: string): void {
    if (!this.state) return;
    const c = new Chess(this.state.fen);
    const mv = c.move(san, { sloppy: true } as any);
    if (!mv) return;
    this.state.fen = c.fen();
    this.state.historySAN.push(mv.san);
    this.state.driver = this.state.driver === 'w' ? 'b' : 'w';
    this.broadcast({ type: 'game/move', from: this.me?.id || 'peer', san: mv.san, fen: this.state.fen });
    this.syncState();
  }

  sendChat?(txt: string): void {
    if (!txt) return;
    this.broadcast({ type: 'chat/msg', from: this.me?.id || 'me', txt });
  }

  heartbeat?(): void {}

  onEvent(handler: (e: NetEvents) => void): void {
    this.handler = handler;
    this.emitState();
  }

  private emitState() {
    if (this.state) this.handler?.({ t: 'room/state', state: this.state });
  }

  private broadcast(e: BroadcastEvent) {
    this.channel?.send({ type: 'broadcast', event: e.type, payload: e });
  }

  private syncState() {
    if (!this.state) return;
    this.broadcast({ type: 'room/state', state: this.state });
    this.emitState();
  }
}


