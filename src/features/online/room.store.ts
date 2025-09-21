import { create } from 'zustand';
import type { Mode, NetAdapter, NetEvents, Player, RoomState, Seat } from '@/net/types';
import { createNet } from '@/net';
import { logState, logMove } from '@/debug/netLogger';
import { sideToMove } from '@/features/chess/logic/chess.rules';
import { getJSON, setJSON, KEYS } from '@/features/storage/mmkv';
import { getPlayerId } from '@/core/identity';
import { useChatStore, type ChatMsg } from '@/features/chat/chat.store';
import { logSupabaseEnv } from '@/shared/supabaseClient';

type State = {
  me: Player;
  room?: RoomState;
  net: NetAdapter;
  autoSeatedFor?: string;
  startedAt?: number;
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
  answerDraw: (accept: boolean) => void;
  requestUndo: () => void;
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
  startedAt: undefined,
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
    // Cleanly leave previous adapter/channel to avoid ghost events
    try { get().net.leave(); } catch {}
    // Always resolve a fresh adapter on join (ensures correct HostLoopback vs Socket selection)
    const net = createNet();
    set({ me, net, room: undefined, startedAt: undefined });
    setJSON(KEYS.lastIdentity, me);
    let archivedVersion = -1;
    // Log Supabase env once per app boot before any first cloud write
    try { logSupabaseEnv(); } catch {}
    net.onEvent((e: NetEvents) => {
      if (e.t === 'room/state') {
        logState('store <- room/state', e.state);
        // Version guard: ignore stale updates
        const current = get().room;
        if (current && typeof e.state.version === 'number' && typeof current.version === 'number' && e.state.version <= current.version) {
          return;
        }
        // Replace state directly; trust host. Avoid client auto-mutations.
        const next = e.state;
        const prev = get().room;
        // set start timestamp when game starts
        if (next.phase === 'ACTIVE' && prev?.phase !== 'ACTIVE') set({ startedAt: Date.now() });
        set({ room: next });
        // archive exactly once when entering RESULT at a new version
        if (next.phase === 'RESULT' && typeof next.version === 'number' && next.version !== archivedVersion && next.result) {
          archivedVersion = next.version!; // mark early to avoid duplicates
          (async () => {
            try {
              // Debug: begin archive save
              if (__DEV__) console.log('[archive] saving', { id: `${next.roomId}-${next.finishedAt ?? Date.now()}`, version: next.version, result: next.result });
              const { insertGame, init } = await import('@/archive/db');
              const { buildPGN } = await import('@/archive/pgn');
              const { upsertGameCloud, enqueueGame } = await import('@/shared/cloud');
              await init();
              const me = get().me;
              const { derivePlayers, escapePGN } = await import('@/shared/players');
              const { whiteName, blackName } = derivePlayers(next, me.id);
              const event = next.mode === '1v1' ? '1v1 online' : next.mode;
              const pgn = buildPGN({ event, whiteName: escapePGN(whiteName), blackName: escapePGN(blackName), result: next.result!, movesSAN: next.historySAN });
              const startedAt = get().startedAt || Date.now();
              const row = {
                id: `${next.roomId}-${next.finishedAt ?? Date.now()}`,
                createdAt: next.finishedAt ?? Date.now(),
                mode: next.mode,
                result: next.result!,
                pgn,
                moves: next.historySAN.length,
                durationMs: Math.max(0, (next.finishedAt || Date.now()) - (startedAt || Date.now())),
                whiteName,
                blackName
              };
              await insertGame(row);
              if (__DEV__) console.log('[archive] inserted local', row.id);
              // optional cloud sync
              const cloud = (await import('@/features/settings/settings.store')).useSettings.getState().cloudArchive;
              const supaUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || (await import('expo-constants')).default.expoConfig?.extra?.supabaseUrl) as string | undefined;
              if (cloud && supaUrl) {
                const pid = (await import('@/core/identity')).getPlayerId();
                if (__DEV__) console.log('[archive] cloud owner', pid);
                const ok = await upsertGameCloud(row as any, pid);
                if (!ok) {
                  enqueueGame(row as any, pid);
                  try {
                    const { toast } = await import('@/ui/atoms');
                    // Best-effort small toast; avoid noisy logs in production
                    (toast as any)?.('Cloud save failed (tap for details)');
                  } catch {}
                  // eslint-disable-next-line no-console
                  console.warn('[cloud] save failed; queued', row.id);
                }
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn('[archive] save error', err);
            }
          })();
        }
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
      } else if (e.t === 'game/finalize') {
        // Idempotent archive on explicit finalize broadcast (covers guests and late joiners)
        const next = e.state;
        if (next && next.result) {
          (async () => {
            try {
              const { insertGame, init } = await import('@/archive/db');
              const { buildPGN } = await import('@/archive/pgn');
              const { derivePlayers, escapePGN } = await import('@/shared/players');
              await init();
              const me = get().me;
              const { whiteName, blackName } = derivePlayers(next, me.id);
              const event = next.mode === '1v1' ? '1v1 online' : next.mode;
              const pgn = buildPGN({ event, whiteName: escapePGN(whiteName), blackName: escapePGN(blackName), result: next.result!, movesSAN: next.historySAN });
              const startedAt = get().startedAt || next.startedAt || Date.now();
              const row = {
                id: `${next.roomId}-${next.finishedAt ?? Date.now()}`,
                createdAt: next.finishedAt ?? Date.now(),
                mode: next.mode,
                result: next.result!,
                pgn,
                moves: next.historySAN.length,
                durationMs: Math.max(0, (next.finishedAt || Date.now()) - (startedAt || Date.now())),
                whiteName,
                blackName
              } as const;
              await insertGame(row as any);
            } catch {}
          })();
        }
      } else if (e.t === 'chat/msg') {
        const r = get().room;
        if (!r) return;
        const msg: ChatMsg = { id: `${Date.now()}`, from: e.from, txt: e.txt, ts: Date.now() } as any;
        useChatStore.getState().append(r.roomId, msg);
      } else if (e.t === 'game/undoAck') {
        // handled via room/state
      } else if (e.t === 'game/drawOffer' || e.t === 'game/drawAnswer' || e.t === 'game/resign') {
        // handled via room/state; nothing else to do
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
    (get().net as any).resign?.();
  },
  offerDraw() {
    (get().net as any).offerDraw?.();
  },
  answerDraw(accept) {
    (get().net as any).answerDraw?.(accept);
  },
  requestUndo() {
    // Supabase: request approval; Loopback: will just undo last ply
    (get().net as any).requestUndo?.() ?? (get().net as any).undo?.();
  }
}));


