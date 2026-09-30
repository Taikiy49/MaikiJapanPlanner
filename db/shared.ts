import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databaseFile = process.env.DB_FILE_NAME || join(process.cwd(), "data", "miaki.sqlite");
mkdirSync(dirname(databaseFile), { recursive: true });

const globalDb = globalThis as typeof globalThis & { miakiSqlite?: DatabaseSync };
const sqlite = globalDb.miakiSqlite ?? new DatabaseSync(databaseFile);
globalDb.miakiSqlite = sqlite;

sqlite.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS shared_state (
    id INTEGER PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

export function getDb() {
  return sqlite;
}
