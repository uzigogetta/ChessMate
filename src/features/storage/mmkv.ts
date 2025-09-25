import { MMKV } from 'react-native-mmkv';

export const kv = new MMKV();

export function setJSON(key: string, value: unknown) {
  try {
    kv.set(key, JSON.stringify(value));
  } catch {}
}

export function getJSON<T = any>(key: string): T | undefined {
  try {
    const v = kv.getString(key);
    if (!v) return undefined;
    return JSON.parse(v) as T;
  } catch {
    return undefined;
  }
}

export const KEYS = {
  lastIdentity: 'cm.identity.last',
  settings: 'cm.settings',
  cloudOutbox: 'cm.cloud.outbox',
  cloudUploaded: 'cm.cloud.uploaded',
  archiveFilters: 'cm.archive.filters',
  commentarySettings: 'cm.commentary.settings',
};


