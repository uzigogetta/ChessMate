import { getSupabaseClient, isSupabaseConfigured } from '@/shared/supabaseClient';
import type { GameRow } from './db';
import { getJSON, setJSON, KEYS } from '@/features/storage/mmkv';
import { getPlayerId } from '@/core/identity';

type OutboxItem = { id: string; row: GameRow; owner: string };

function loadOutbox(): OutboxItem[] {
  return (getJSON<OutboxItem[]>(KEYS.cloudOutbox) ?? []) as OutboxItem[];
}

function saveOutbox(q: OutboxItem[]) {
  setJSON(KEYS.cloudOutbox, q);
}

export function isUploaded(id: string): boolean {
  const map = (getJSON<Record<string, boolean>>(KEYS.cloudUploaded) ?? {}) as Record<string, boolean>;
  return !!map[id];
}

function markUploaded(id: string) {
  const map = (getJSON<Record<string, boolean>>(KEYS.cloudUploaded) ?? {}) as Record<string, boolean>;
  map[id] = true;
  setJSON(KEYS.cloudUploaded, map);
}

export async function upsertGameCloud(row: GameRow, owner: string): Promise<boolean> {
  try {
    if (!isSupabaseConfigured()) {
      return false;
    }
    const supabase = getSupabaseClient();
    const payload = {
      id: row.id,
      created_at: new Date(row.createdAt).toISOString(),
      mode: row.mode as any,
      result: row.result as any,
      pgn: row.pgn,
      moves: Math.max(0, Math.floor(row.moves ?? 0)),
      duration_ms: Math.min(2147483647, Math.max(0, Math.floor(row.durationMs ?? 0))),
      white_name: row.whiteName ?? null,
      black_name: row.blackName ?? null,
      owner
    } as any;

    // Use provided owner as source of truth; header is already set globally.

    const { data, error, status } = await supabase
      .from('archive_games')
      .upsert(payload, { onConflict: 'id' })
      .select('id')
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[cloud] upsert error', { status, error });
      try {
        const Sentry = require('@sentry/react-native');
        Sentry.addBreadcrumb({ category: 'cloud', message: 'archive upsert failed', level: 'error', data: { status, error } });
      } catch {}
      return false;
    }

    // eslint-disable-next-line no-console
    console.log('[cloud] upsert ok', data?.id);
    markUploaded(row.id);
    return !!data?.id;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[cloud] upsert threw', err);
    return false;
  }
}

export function enqueueGame(row: GameRow, owner: string) {
  const q = loadOutbox();
  // De-duplicate by id
  if (!q.find((i) => i.id === row.id)) q.unshift({ id: row.id, row, owner });
  saveOutbox(q);
  // Try immediate flush, fire-and-forget
  flushOutbox().catch(() => {});
}

export async function flushOutbox() {
  let q = loadOutbox();
  if (!q.length) return { uploaded: [] as string[] };
  const uploaded: string[] = [];
  const next: OutboxItem[] = [];
  for (const item of q) {
    const ok = await upsertGameCloud(item.row, item.owner);
    if (ok) uploaded.push(item.id);
    else next.push(item);
  }
  saveOutbox(next);
  if (uploaded.length) {
    // eslint-disable-next-line no-console
    console.log('[cloud] flushed', uploaded.length, 'item(s)');
  }
  return { uploaded };
}

export async function cloudSelfTest() {
  const id = `selftest_${Date.now()}`;
  const owner = getPlayerId();
  const ok = await upsertGameCloud({
    id,
    createdAt: Date.now(),
    mode: '1v1' as any,
    result: '1-0' as any,
    pgn: '[Event "SelfTest"]\n\n1. e4 *',
    moves: 1,
    durationMs: 1234,
    whiteName: 'Self',
    blackName: 'Test'
  } as any, owner);
  // eslint-disable-next-line no-console
  console.log('[cloud] selftest', id, ok ? 'ok' : 'failed');
  return { id, ok };
}


