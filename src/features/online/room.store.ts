import { create } from 'zustand';
import { Platform } from 'react-native';
import type { Mode, NetAdapter, NetEvents, Player, RoomOptions, RoomState, Seat } from '@/net/types';
import { createNet } from '@/net';
import { logState, logMove } from '@/debug/netLogger';
import { sideToMove } from '@/features/chess/logic/chess.rules';
import { getJSON, setJSON, KEYS } from '@/features/storage/mmkv';
import { getPlayerId } from '@/core/identity';
import { useChatStore, type ChatMsg } from '@/features/chat/chat.store';
import { logSupabaseEnv } from '@/shared/supabaseClient';
import { createArchiveGuard } from '@/features/online/archiveGuard';
import { useReview } from '@/features/view/review.store';
import { detectTerminal } from '@/game/terminal';

type State = {
  me: Player;
  room?: RoomState;
  net: NetAdapter;
  autoSeatedFor?: string;
  startedAt?: number;
  isMyTurn: () => boolean;
  readyToStart: () => boolean;
  join: (roomId: string, mode: Mode, name?: string) => Promise<void>;
  patchRoomOptions: (partial: Partial<RoomOptions>) => void;
  patchRated: (rated: boolean) => void;
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
  patchRoomOptions(partial) {
    (get().net as any).patchRoomOptions?.(partial);
  },
  patchRated(rated) {
    (get().net as any).patchRated?.(rated);
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
    const archiveGuard = createArchiveGuard();
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
        // Android safeguard: if host forgot to broadcast finalize but we detect terminal locally, coerce RESULT
        try {
          if (next.phase !== 'RESULT') {
            const t = detectTerminal(next.fen, next.historySAN);
            if (t.over) {
              const coerced = { ...next, phase: 'RESULT' as const, result: t.result, result_reason: t.reason, finishedAt: Date.now(), version: (next.version || 0) + 1 };
              set({ room: coerced });
              // Trigger archive once via the same guard path below
              if (typeof coerced.version === 'number' && coerced.version !== archivedVersion && coerced.result) {
                archivedVersion = coerced.version!;
                if (archiveGuard.shouldArchive(coerced)) {
                  (async () => {
                    try {
                      const { insertGame, init } = await import('@/archive/db');
                      const { buildPGN } = await import('@/archive/pgn');
                      await init();
                      const me = get().me;
                      const { derivePlayers, escapePGN } = await import('@/shared/players');
                      const { whiteName, blackName } = derivePlayers(coerced, me.id);
                      const event = coerced.mode === '1v1' ? '1v1 online' : coerced.mode;
                      const pgn = buildPGN({ event, whiteName: escapePGN(whiteName), blackName: escapePGN(blackName), result: coerced.result!, movesSAN: coerced.historySAN, termination: (coerced as any).result_reason });
                      const startedAt = get().startedAt || Date.now();
                      const row = { id: `${coerced.roomId}-${coerced.finishedAt ?? Date.now()}`, createdAt: coerced.finishedAt ?? Date.now(), mode: coerced.mode, result: coerced.result!, pgn, moves: coerced.historySAN.length, durationMs: Math.max(0, (coerced.finishedAt || Date.now()) - (startedAt || Date.now())), whiteName, blackName } as const;
                      await insertGame(row as any);
                    } catch {}
                  })();
                }
              }
            }
          }
        } catch {}
        // Snap to latest on any authoritative state update (prevents being stuck mid-review)
        try {
          const { goLive } = useReview.getState();
          const total = next.historySAN?.length ?? 0;
          if (total >= 0) goLive(total);
        } catch {}
        // archive exactly once when entering RESULT at a new version
        if (next.phase === 'RESULT' && typeof next.version === 'number' && next.version !== archivedVersion && next.result) {
          archivedVersion = next.version!; // mark early to avoid duplicates
          if (!archiveGuard.shouldArchive(next)) {
            return;
          }
          (async () => {
            try {
              // Debug: begin archive save
              if (__DEV__) console.log('[archive] saving', { id: `${next.roomId}-${next.finishedAt ?? Date.now()}`, version: next.version, result: next.result });
              const { insertGame, init } = await import('@/archive/db');
              const { buildPGN } = await import('@/archive/pgn');
              const { upsertGameCloud, enqueueGame } = await import('@/shared/cloud');
              const { isSupabaseConfigured } = await import('@/shared/supabaseClient');
              await init();
              const me = get().me;
              const { derivePlayers, escapePGN } = await import('@/shared/players');
              const { whiteName, blackName } = derivePlayers(next, me.id);
              const event = next.mode === '1v1' ? 'Online Game' : next.mode;
              const pgn = buildPGN({ event, whiteName: escapePGN(whiteName), blackName: escapePGN(blackName), result: next.result!, movesSAN: next.historySAN, termination: (next as any).result_reason });
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
              if (cloud && supaUrl && isSupabaseConfigured()) {
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
        // On any new move (mine or opponent's), snap back to live view locally
        // so arrows never stall the game progression.
        // (Local-only: does not mutate authoritative state or network.)
        const nextDriver = sideToMove(e.fen);
        const updated: RoomState = {
          ...r,
          fen: e.fen,
          historySAN: [...r.historySAN, e.san],
          driver: nextDriver
        };
        set({ room: updated });
        try {
          const { goLive } = useReview.getState();
          goLive(updated.historySAN.length);
        } catch {}
      } else if (e.t === 'game/finalize') {
        // Idempotent archive on explicit finalize broadcast (covers guests and late joiners)
        const next = e.state;
        if (next && next.result) {
          if (!archiveGuard.shouldArchive(next)) {
            return;
          }
          (async () => {
            try {
              const { insertGame, init } = await import('@/archive/db');
              const { buildPGN } = await import('@/archive/pgn');
              const { derivePlayers, escapePGN } = await import('@/shared/players');
              await init();
              const me = get().me;
              const { whiteName, blackName } = derivePlayers(next, me.id);
              const event = next.mode === '1v1' ? 'Online Game' : next.mode;
              const pgn = buildPGN({ event, whiteName: escapePGN(whiteName), blackName: escapePGN(blackName), result: next.result!, movesSAN: next.historySAN, termination: (next as any).result_reason });
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
              // opportunistic cloud upload on guest path too
              try {
                const { isSupabaseConfigured } = await import('@/shared/supabaseClient');
                const { upsertGameCloud, enqueueGame } = await import('@/shared/cloud');
                const cloud = (await import('@/features/settings/settings.store')).useSettings.getState().cloudArchive;
                const supaUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || (await import('expo-constants')).default.expoConfig?.extra?.supabaseUrl) as string | undefined;
                if (cloud && supaUrl && isSupabaseConfigured()) {
                  const pid = (await import('@/core/identity')).getPlayerId();
                  const ok = await upsertGameCloud(row as any, pid);
                  if (!ok) enqueueGame(row as any, pid);
                }
              } catch {}
            } catch {}
          })();
        }
      } else if (e.t === 'chat/msg') {
        const r = get().room;
        if (!r) return;
        const msg: ChatMsg = { id: `${Date.now()}`, from: e.from, txt: e.txt, ts: Date.now() } as any;
        useChatStore.getState().append(r.roomId, msg);
      } else if (e.t === 'game/undoAck') {
        // handled via room/state; still show toast feedback
        (async () => {
          try {
            const { toast } = await import('@/ui/toast');
            const H = await import('expo-haptics');
            if (e.ok) {
              toast('Move undone');
              (H as any).notificationAsync?.(H.NotificationFeedbackType.Success);
            } else {
              toast('Undo declined');
              (H as any).notificationAsync?.(H.NotificationFeedbackType.Warning);
            }
          } catch {}
        })();
      } else if (e.t === 'game/drawOffer' || e.t === 'game/drawAnswer' || e.t === 'game/resign') {
        // handled via room/state; still toast draw answers
        if (e.t === 'game/drawAnswer') {
          (async () => {
            try {
              const { toast } = await import('@/ui/toast');
              const H = await import('expo-haptics');
              if ((e as any).accept) {
                toast('Game drawn');
                (H as any).notificationAsync?.(H.NotificationFeedbackType.Success);
              } else {
                toast('Draw declined');
                (H as any).notificationAsync?.(H.NotificationFeedbackType.Warning);
              }
            } catch {}
          })();
        }
      }
    });
    await net.join(roomId, mode, me.name, me.id);
    // Android-only: safety poller to ensure RESULT is archived even if a broadcast is missed
    if (Platform.OS === 'android') {
      const poll = setInterval(() => {
        try {
          const r = get().room;
          if (r && r.phase === 'RESULT' && typeof r.version === 'number' && r.version !== archivedVersion && r.result) {
            archivedVersion = r.version!;
            if (!archiveGuard.shouldArchive(r)) return;
            (async () => {
              try {
                const { insertGame, init } = await import('@/archive/db');
                const { buildPGN } = await import('@/archive/pgn');
                await init();
                const me2 = get().me;
                const { derivePlayers, escapePGN } = await import('@/shared/players');
                const { whiteName, blackName } = derivePlayers(r, me2.id);
                const event = r.mode === '1v1' ? '1v1 online' : r.mode;
                const pgn = buildPGN({ event, whiteName: escapePGN(whiteName), blackName: escapePGN(blackName), result: r.result!, movesSAN: r.historySAN, termination: (r as any).result_reason });
                const startedAt = get().startedAt || r.startedAt || Date.now();
                const row = { id: `${r.roomId}-${r.finishedAt ?? Date.now()}`, createdAt: r.finishedAt ?? Date.now(), mode: r.mode, result: r.result!, pgn, moves: r.historySAN.length, durationMs: Math.max(0, (r.finishedAt || Date.now()) - (startedAt || Date.now())), whiteName, blackName } as const;
                await insertGame(row as any);
              } catch {}
            })();
          }
        } catch {}
      }, 1000);
      // Clear on leave
      const origLeave = get().leave;
      set({
        leave: () => {
          try { clearInterval(poll); } catch {}
          origLeave();
        }
      } as any);
    }
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




