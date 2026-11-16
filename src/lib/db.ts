import { createClient, type Client } from "@libsql/client";

/**
 * Lokal: file:local.db (tanpa akun Turso).
 * Vercel: isi TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 */
let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:local.db",
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return client;
}

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS categories (
     slug TEXT PRIMARY KEY,
     name TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS faqs (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     category TEXT NOT NULL REFERENCES categories(slug),
     question TEXT NOT NULL,
     answer TEXT NOT NULL,
     keywords TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  // Indeks pencarian teks penuh. Dibangun ulang tiap seed.
  `CREATE VIRTUAL TABLE IF NOT EXISTS faqs_fts USING fts5(
     question, answer, keywords,
     content='faqs', content_rowid='id',
     tokenize='unicode61 remove_diacritics 2'
   )`,
  // Pertanyaan yang dioper ke CS (sekaligus log pertanyaan yang belum ada di DB).
  `CREATE TABLE IF NOT EXISTS handoff_requests (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     session_id TEXT NOT NULL,
     question TEXT NOT NULL,
     reason TEXT NOT NULL,
     transcript TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'menunggu',
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS rate_hits (
     key TEXT NOT NULL,
     at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS rate_hits_key_at ON rate_hits(key, at)`,
];
