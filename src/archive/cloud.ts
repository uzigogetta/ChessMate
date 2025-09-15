import { supabase } from '@/net/supabaseClient';
import type { GameRow } from './db';
import { kv, getJSON, setJSON } from '@/features/storage/mmkv';

type OutboxItem = { id: string; row: GameRow; owner: string };

const OUTBOX_KEY = 'cm.cloud.outbox';
const UPLOADED_KEY = 'cm.cloud.uploaded';

function loadOutbox(): OutboxItem[] {
  return (getJSON<OutboxItem[]>(OUTBOX_KEY) ?? []) as OutboxItem[];
}

function saveOutbox(q: OutboxItem[]) {
  setJSON(OUTBOX_KEY, q);
}

export function isUploaded(id: string): boolean {
  const map = (getJSON<Record<string, boolean>>(UPLOADED_KEY) ?? {}) as Record<string, boolean>;
  return !!map[id];
}

function markUploaded(id: string) {
  const map = (getJSON<Record<string, boolean>>(UPLOADED_KEY) ?? {}) as Record<string, boolean>;
  map[id] = true;
  setJSON(UPLOADED_KEY, map);
}

export async function upsertGameCloud(row: GameRow, owner: string): Promise<boolean> {
  try {
    const payload = {
      id: row.id,
      created_at: new Date(row.createdAt).toISOString(),
      mode: row.mode,
      result: row.result,
      pgn: row.pgn,
      moves: row.moves,
      duration_ms: row.durationMs,
      white_name: row.whiteName ?? null,
      black_name: row.blackName ?? null,
      owner
    } as any;
    const { error } = await supabase.from('archive_games').upsert(payload, { onConflict: 'id' });
    if (!error) {
      markUploaded(row.id);
      return true;
    }
  } catch {}
  return false;
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
  return { uploaded };
}


