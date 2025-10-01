import { MMKV } from 'react-native-mmkv';

const kv = new MMKV({ id: 'replay-cache' });

const key = (gameId: string, ply: number) => `rc:${gameId}:${ply}`;

export type EvalEntry = {
  cp?: number;
  mate?: number;
  pv?: string[];
  bestSan?: string;
};

export function getEval(gameId: string, ply: number): EvalEntry | null {
  try {
    const raw = kv.getString(key(gameId, ply));
    if (!raw) return null;
    return JSON.parse(raw) as EvalEntry;
  } catch {
    return null;
  }
}

export function setEval(gameId: string, ply: number, value: EvalEntry) {
  try {
    kv.set(key(gameId, ply), JSON.stringify(value));
  } catch {}
}
