import { kv } from '@/features/storage/mmkv';
import { customAlphabet } from 'nanoid/non-secure';

const KEY_ID = 'cm.playerId';
const KEY_NAME = 'cm.displayName';
const genId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

export function getPlayerId(): string {
  let id = kv.getString(KEY_ID);
  if (!id) {
    id = `u_${genId()}`;
    kv.set(KEY_ID, id);
  }
  return id;
}

export function getDisplayName(): string | undefined {
  return kv.getString(KEY_NAME) || undefined;
}

export function setDisplayName(name: string) {
  kv.set(KEY_NAME, name);
}


