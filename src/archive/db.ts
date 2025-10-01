import { openArchiveDB, exec as sqliteExec, query as sqliteQuery, dbHealthcheck } from '@/archive/sqlite';

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

export type RecentGameRow = Pick<GameRow, 'id' | 'createdAt' | 'mode' | 'result' | 'moves' | 'whiteName' | 'blackName'>;

export async function listRecentGames(limit = 3): Promise<RecentGameRow[]> {
  await ensureDb();

  if (usingMemory()) {
    return Array.from(memory.games.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(({ id, createdAt, mode, result, moves, whiteName, blackName }) => ({ id, createdAt, mode, result, moves, whiteName, blackName }));
  }

  const sql = `SELECT id, createdAt, mode, result, moves, whiteName, blackName
               FROM games
               ORDER BY createdAt DESC
               LIMIT ?`;
  return query<RecentGameRow>(sql, [limit]);
}

let db: any | null = null;
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

async function ensureDb() {
  if (db) return db;
  try {
    db = await openArchiveDB();
    sqliteAvailable = !!db;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[SQLite] Failed to open DB, falling back to memory store:', e);
    db = null;
    sqliteAvailable = false;
  }
  return db;
}

export async function init() {
  const d: any = await ensureDb();
  if (!d || usingMemory()) {
    if (!warnedUnavailable) {
      // eslint-disable-next-line no-console
      console.warn('[SQLite] Not available. Using in-memory archive.');
      warnedUnavailable = true;
    }
    // Ensure memory storage is initialized but do NOT clear existing rows
    ensureMemoryReady();
    return;
  }
  await run(`PRAGMA foreign_keys = ON;`);
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
  if (__DEV__) {
    try { await dbHealthcheck(d); } catch {}
  }
}

async function run(sql: string, params: any[] = []) {
  const d: any = await ensureDb();
  if (!d || usingMemory()) return;
  return sqliteExec(d, sql, params);
}

async function query<T = any>(sql: string, params: any[] = []) {
  const d: any = await ensureDb();
  if (!d || usingMemory()) return [] as T[];
  return sqliteQuery<T>(d, sql, params);
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
