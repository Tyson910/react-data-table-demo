import Database from "better-sqlite3";
import { type Generated, Kysely, SqliteDialect, sql } from "kysely";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface UserTable {
  id: Generated<number>;
  name: string;
  email: string;
}

interface DB {
  users: UserTable;
}

const dbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db.sqlite");

const dialect = new SqliteDialect({ database: new Database(dbPath) });

export const db = new Kysely<DB>({ dialect });

const SEED_USERS = [
  { name: "Alice Johnson", email: "alice@example.com" },
  { name: "Bob Smith", email: "bob@example.com" },
  { name: "Carol Williams", email: "carol@example.com" },
];

export async function initDb(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    )
  `.execute(db);

  await db
    .insertInto("users")
    .values(SEED_USERS)
    .onConflict((oc) => oc.column("email").doNothing())
    .execute();
}
