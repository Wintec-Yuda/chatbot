import { getDb } from "./db";

const WINDOW_MS = 10 * 60 * 1000;

/**
 * Batas pesan per IP dalam 10 menit (default 20, ubah lewat RATE_LIMIT_PER_10MIN).
 * Disimpan di DB, bukan memori, karena di Vercel tiap request bisa jalan di instance berbeda.
 */
export async function checkRateLimit(key: string): Promise<{ ok: boolean; retryAfterSec: number }> {
  const limit = Number(process.env.RATE_LIMIT_PER_10MIN) || 20;
  const now = Date.now();
  const since = now - WINDOW_MS;
  const db = getDb();

  try {
    await db.execute({ sql: "DELETE FROM rate_hits WHERE at < ?", args: [since] });
    const { rows } = await db.execute({
      sql: "SELECT COUNT(*) AS n, MIN(at) AS first FROM rate_hits WHERE key = ? AND at >= ?",
      args: [key, since],
    });
    const n = Number(rows[0].n);
    if (n >= limit) {
      const first = Number(rows[0].first);
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((first + WINDOW_MS - now) / 1000)) };
    }
    await db.execute({ sql: "INSERT INTO rate_hits (key, at) VALUES (?, ?)", args: [key, now] });
  } catch (e) {
    // Jangan sampai chat mati hanya karena pembatas gagal.
    console.error("[rateLimit]", e);
  }
  return { ok: true, retryAfterSec: 0 };
}
