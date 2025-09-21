import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export type GameRow = {
  id: string;
  createdAt: number;
  mode: string;
  result: string;
  pgn: string;
  moves: number;
  durationMs: number;
  whiteName?: string;
  blackName?: string;
};

let db: SQLite.SQLiteDatabase | null = null;
let sqliteAvailable = false;
let warnedUnavailable = false;

const memory = {
  ready: false,
  games: new Map<string, GameRow>(),
  favorites: new Set<string>(),
};

function usingMemory() {
  return !sqliteAvailable || !db;
}

function ensureMemoryReady() {
  if (!memory.ready) memory.ready = true;
}

function resetMemory() {
  ensureMemoryReady();
  memory.games.clear();
  memory.favorites.clear();
}

export function open() {
  if (db) return db;
  try {
    let mod: any = null;
    try {
      mod = require('expo-sqlite/legacy');
    } catch {}
    if (!mod) {
      try {
        mod = require('expo-sqlite');
      } catch {}
    }

    const openLegacy = mod?.openDatabase ?? mod?.default?.openDatabase ?? (SQLite as any).openDatabase;
    if (typeof openLegacy === 'function') {
      db = openLegacy('chessmate.db');
      sqliteAvailable = !!db;
      return db;
    }

    if (Platform.OS !== 'android') {
      const openSync = (mod?.openDatabaseSync ?? mod?.default?.openDatabaseSync ?? (SQLite as any).openDatabaseSync) as
        | ((name: string) => SQLite.SQLiteDatabase)
        | undefined;
      if (typeof openSync === 'function') {
        db = openSync('chessmate.db');
        sqliteAvailable = !!db;
        return db;
      }
    }
  } catch (e) {
    console.error('[SQLite] Failed to open database:', e);
  }
  sqliteAvailable = false;
  return db as any;
}

export async function init() {
  const d: any = open();
  if (!d || usingMemory()) {
    if (!warnedUnavailable) {
      // eslint-disable-next-line no-console
      console.warn('[SQLite] Not available. Using in-memory archive.');
      warnedUnavailable = true;
    }
    resetMemory();
    return;
  }
  try {
    if (Platform.OS !== 'android') {
      if (typeof d.execAsync === 'function') await d.execAsync(`PRAGMA journal_mode = WAL;`);
      else if (typeof d.execSync === 'function') d.execSync(`PRAGMA journal_mode = WAL;`);
      else await run(`PRAGMA journal_mode = WAL;`);
    }
  } catch {}
  await run(`CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY NOT NULL,
    createdAt INTEGER NOT NULL,
    mode TEXT NOT NULL,
    result TEXT NOT NULL,
    pgn TEXT NOT NULL,
    moves INTEGER NOT NULL,
    durationMs INTEGER NOT NULL,
    whiteName TEXT,
    blackName TEXT
  );`);
  await run(`CREATE TABLE IF NOT EXISTS favorites (
    gameId TEXT PRIMARY KEY NOT NULL
  );`);
}

function run(sql: string, params: any[] = []) {
  const d: any = open();
  if (!d || usingMemory()) {
    return Promise.resolve();
  }
  if (Platform.OS === 'android' || !d.runAsync) {
    return new Promise<void>((resolve, reject) => {
      d.transaction((tx: any) => {
        tx.executeSql(sql, params, () => resolve(), (_tx: any, err: any) => {
          reject(err);
          return false;
        });
      });
    });
  }
  if (typeof d.runAsync === 'function') {
    return d.runAsync(sql, params).then(() => {});
  }
  if (typeof d.runSync === 'function') {
    d.runSync(sql, params);
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    d.transaction((tx: any) => {
      tx.executeSql(sql, params, () => resolve(), (_tx: any, err: any) => {
        reject(err);
        return false;
      });
    });
  });
}

function query<T = any>(sql: string, params: any[] = []) {
  const d: any = open();
  if (!d || usingMemory()) {
    return Promise.resolve([] as T[]);
  }
  if (Platform.OS === 'android' || !d.getAllAsync) {
    return new Promise<T[]>((resolve, reject) => {
      d.transaction((tx: any) => {
        tx.executeSql(sql, params, (_tx: any, res: any) => {
          const out: T[] = [] as any;
          for (let i = 0; i < res.rows.length; i++) out.push(res.rows.item(i));
          resolve(out);
        }, (_tx: any, err: any) => {
          reject(err);
          return false;
        });
      });
    });
  }
  if (typeof d.getAllAsync === 'function') {
    return d.getAllAsync(sql, params) as Promise<T[]>;
  }
  if (typeof d.getAllSync === 'function') {
    return Promise.resolve(d.getAllSync(sql, params) as T[]);
  }
  return new Promise<T[]>((resolve, reject) => {
    d.transaction((tx: any) => {
      tx.executeSql(sql, params, (_tx: any, res: any) => {
        const out: T[] = [] as any;
        for (let i = 0; i < res.rows.length; i++) out.push(res.rows.item(i));
        resolve(out);
      }, (_tx: any, err: any) => {
        reject(err);
        return false;
      });
    });
  });
}

function memoryList(filters: ListGamesFilters, limit = 50, offset = 0) {
  ensureMemoryReady();
  let rows = Array.from(memory.games.values());
  if (filters.mode !== 'all') {
    rows = rows.filter((row) => row.mode === filters.mode);
  }
  if (filters.result !== 'any') {
    rows = rows.filter((row) => row.result === filters.result);
  }
  if (filters.favoritesOnly) {
    rows = rows.filter((row) => memory.favorites.has(row.id));
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    rows = rows.filter((row) => (row.whiteName ?? '').toLowerCase().includes(q) || (row.blackName ?? '').toLowerCase().includes(q));
  }
  const sortKey = filters.sort;
  rows.sort((a, b) => {
    if (sortKey === 'moves') return b.moves - a.moves;
    if (sortKey === 'old') return a.createdAt - b.createdAt;
    return b.createdAt - a.createdAt;
  });
  return rows.slice(offset, offset + limit);
}

function memoryGet(id: string) {
  ensureMemoryReady();
  return memory.games.get(id) ?? null;
}

function memoryInsert(row: GameRow) {
  ensureMemoryReady();
  memory.games.set(row.id, { ...row });
}

function memoryDelete(id: string) {
  ensureMemoryReady();
  memory.games.delete(id);
  memory.favorites.delete(id);
}

function memoryAddFavorites(ids: string[]) {
  ensureMemoryReady();
  ids.forEach((id) => memory.favorites.add(id));
}

function memoryRemoveFavorites(ids: string[]) {
  ensureMemoryReady();
  ids.forEach((id) => memory.favorites.delete(id));
}

export type ListGamesFilters = {
  mode: 'all' | 'online' | 'local' | 'ai';
  result: 'any' | '1-0' | '0-1' | '1/2-1/2';
  sort: 'new' | 'old' | 'moves';
  favoritesOnly: boolean;
  query: string;
};

export async function insertGame(row: GameRow) {
  if (usingMemory()) {
    memoryInsert(row);
    return;
  }
  await run(
    `INSERT OR REPLACE INTO games (id, createdAt, mode, result, pgn, moves, durationMs, whiteName, blackName)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.createdAt, row.mode, row.result, row.pgn, row.moves, row.durationMs, row.whiteName ?? null, row.blackName ?? null]
  );
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[db] insert', row.id);
  }
}

export async function listGames(filters: ListGamesFilters, limit = 50, offset = 0) {
  if (usingMemory()) {
    return memoryList(filters, limit, offset);
  }

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (filters.mode !== 'all') {
    whereClauses.push('mode = ?');
    params.push(filters.mode);
  }
  if (filters.result !== 'any') {
    whereClauses.push('result = ?');
    params.push(filters.result);
  }
  if (filters.favoritesOnly) {
    whereClauses.push('id IN (SELECT gameId FROM favorites)');
  }
  if (filters.query) {
    whereClauses.push('(whiteName LIKE ? OR blackName LIKE ?)');
    params.push(`%${filters.query}%`, `%${filters.query}%`);
  }

  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const sortMap = {
    new: 'createdAt DESC',
    old: 'createdAt ASC',
    moves: 'moves DESC',
  };
  const orderBy = `ORDER BY ${sortMap[filters.sort]}`;

  const sql = `SELECT * FROM games ${where} ${orderBy} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return query<GameRow>(sql, params);
}

export async function getGame(id: string) {
  if (usingMemory()) {
    return memoryGet(id);
  }
  const rows = await query<GameRow>(`SELECT * FROM games WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

export async function deleteGame(id: string) {
  if (usingMemory()) {
    memoryDelete(id);
    return;
  }
  await run(`DELETE FROM games WHERE id = ?`, [id]);
  await run(`DELETE FROM favorites WHERE gameId = ?`, [id]);
}

export async function addFavorite(gameId: string) {
  if (usingMemory()) {
    memoryAddFavorites([gameId]);
    return;
  }
  await run(`INSERT OR IGNORE INTO favorites (gameId) VALUES (?)`, [gameId]);
}

export async function addFavorites(gameIds: string[]) {
  if (gameIds.length === 0) return;
  if (usingMemory()) {
    memoryAddFavorites(gameIds);
    return;
  }
  const placeholders = gameIds.map(() => '(?)').join(',');
  await run(`INSERT OR IGNORE INTO favorites (gameId) VALUES ${placeholders}`, gameIds);
}

export async function removeFavorite(gameId: string) {
  if (usingMemory()) {
    memoryRemoveFavorites([gameId]);
    return;
  }
  await run(`DELETE FROM favorites WHERE gameId = ?`, [gameId]);
}

export async function removeFavorites(gameIds: string[]) {
  if (gameIds.length === 0) return;
  if (usingMemory()) {
    memoryRemoveFavorites(gameIds);
    return;
  }
  const placeholders = gameIds.map(() => '?').join(',');
  await run(`DELETE FROM favorites WHERE gameId IN (${placeholders})`, gameIds);
}

export async function listFavorites(): Promise<string[]> {
  if (usingMemory()) {
    return Array.from(memory.favorites);
  }
  const rows = await query<{ gameId: string }>(`SELECT gameId FROM favorites`);
  return rows.map((r) => r.gameId);
}

export async function debugListGames(limit = 20) {
  await init();
  const rows = await listGames({ mode: 'all', result: 'any', sort: 'new', favoritesOnly: false }, limit, 0);
  // eslint-disable-next-line no-console
  console.log('[db] games', rows.length, rows);
  return rows;
}

if (__DEV__) {
  (globalThis as any).dbListGames = debugListGames;
}
