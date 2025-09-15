import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function open() {
  if (!db) db = SQLite.openDatabaseSync?.('chessmate.db') ?? (SQLite as any).openDatabase('chessmate.db');
  return db!;
}

export async function init() {
  const d = open();
  d.execSync?.(`PRAGMA journal_mode = WAL;`);
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
}

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

function run(sql: string, params: any[] = []) {
  const d = open();
  return new Promise<void>((resolve, reject) => {
    d.transaction((tx) => {
      tx.executeSql(sql, params, () => resolve(), (_tx, err) => {
        reject(err);
        return false;
      });
    });
  });
}

function query<T = any>(sql: string, params: any[] = []) {
  const d = open();
  return new Promise<T[]>((resolve, reject) => {
    d.transaction((tx) => {
      tx.executeSql(sql, params, (_tx, res) => {
        const out: T[] = [] as any;
        for (let i = 0; i < res.rows.length; i++) out.push(res.rows.item(i));
        resolve(out);
      }, (_tx, err) => {
        reject(err);
        return false;
      });
    });
  });
}

export async function insertGame(row: GameRow) {
  await run(
    `INSERT OR REPLACE INTO games (id, createdAt, mode, result, pgn, moves, durationMs, whiteName, blackName)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.createdAt, row.mode, row.result, row.pgn, row.moves, row.durationMs, row.whiteName ?? null, row.blackName ?? null]
  );
}

export async function listGames(limit = 50, offset = 0) {
  return query<GameRow>(`SELECT * FROM games ORDER BY createdAt DESC LIMIT ? OFFSET ?`, [limit, offset]);
}

export async function getGame(id: string) {
  const rows = await query<GameRow>(`SELECT * FROM games WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}


