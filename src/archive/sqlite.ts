import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export type DB = any;

// Open archive DB with feature detection. Prefer modern async API when available.
export async function openArchiveDB(): Promise<DB> {
  // Modern async driver (preferred on both platforms)
  if ('openDatabaseAsync' in SQLite) {
    const db: any = await (SQLite as any).openDatabaseAsync('chessmate.db');
    // Enable safe pragmas
    try {
      // Foreign keys safety across both platforms
      if ('execAsync' in db) {
        await db.execAsync?.('PRAGMA foreign_keys = ON;');
        // WAL on iOS only (Android legacy driver may flake; async driver is usually fine, but be conservative)
        if (Platform.OS === 'ios') {
          await db.execAsync?.('PRAGMA journal_mode = WAL;');
        }
      }
    } catch {}
    return db;
  }

  // Legacy WebSQL fallback
  // NOTE: No async/await here; this returns a WebSQL-like handle
  return (SQLite as any).openDatabase('chessmate.db');
}

// Execute a statement with no rows expected
export async function exec(db: any, sql: string, args: any[] = []): Promise<void> {
  if (!db) return;
  // Modern async APIs
  // Prefer runAsync when parameters are provided; execAsync does not accept params
  if (typeof db.runAsync === 'function' && args?.length) {
    await db.runAsync(sql, args);
    return;
  }
  if (typeof db.execAsync === 'function') {
    await db.execAsync(sql);
    return;
  }
  if (typeof db.runAsync === 'function') {
    await db.runAsync(sql, args);
    return;
  }
  // Legacy WebSQL fallback
  if (typeof db.transaction === 'function') {
    await new Promise<void>((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(sql, args, () => resolve(), (_: any, e: any) => (reject(e), false));
      });
    });
    return;
  }
  throw new Error('No SQLite exec API available');
}

// Query rows
export async function query<T = any>(db: any, sql: string, args: any[] = []): Promise<T[]> {
  if (!db) return [] as T[];
  // Modern async APIs
  if (typeof db.getAllAsync === 'function') {
    return (await db.getAllAsync(sql, args)) as T[];
  }
  if (typeof db.executeAsync === 'function' && typeof db.getFirstAsync === 'function') {
    // Some drivers expose varied methods; try a generic path
    const rows = (await db.executeAsync(sql, args)) as T[];
    return rows as T[];
  }
  // Legacy WebSQL fallback
  if (typeof db.readTransaction === 'function') {
    return await new Promise<T[]>((resolve, reject) => {
      db.readTransaction((tx: any) => {
        tx.executeSql(
          sql,
          args,
          (_: any, res: any) => resolve(res?.rows?._array ?? []),
          (_: any, e: any) => (reject(e), false)
        );
      });
    });
  }
  if (typeof db.transaction === 'function') {
    // Some legacy drivers only expose transaction
    return await new Promise<T[]>((resolve, reject) => {
      db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          args,
          (_: any, res: any) => resolve(res?.rows?._array ?? []),
          (_: any, e: any) => (reject(e), false)
        );
      });
    });
  }
  throw new Error('No SQLite query API available');
}

// Lightweight healthcheck (dev only)
export async function dbHealthcheck(db: any) {
  try {
    await exec(db, 'CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)');
    await exec(db, 'INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)', ['__health', Date.now().toString()]);
    await query(db, 'SELECT v FROM kv WHERE k = ?', ['__health']);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[db] healthcheck failed', e);
  }
}


