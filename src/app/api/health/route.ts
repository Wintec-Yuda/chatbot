import { classify, useHfIntent } from "@/lib/intent";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

/**
 * GET /api/health — cek koneksi DB dan (mode hf) pemuatan model.
 * Hanya menampilkan pesan error, tanpa nilai env/token.
 */
export async function GET() {
  const result: Record<string, unknown> = {
    mode: useHfIntent() ? "hf" : "groq",
    runtime: `${process.platform}-${process.arch} node ${process.version}`,
  };

  try {
    const { rows } = await getDb().execute("SELECT COUNT(*) AS n FROM faqs");
    result.db = { ok: true, faqs: Number(rows[0].n) };
  } catch (e) {
    result.db = { ok: false, error: (e as Error).message };
  }

  if (useHfIntent()) {
    const t0 = Date.now();
    try {
      result.model = { ok: true, sample: await classify("paket belum sampai"), ms: Date.now() - t0 };
    } catch (e) {
      const err = e as Error;
      result.model = {
        ok: false,
        ms: Date.now() - t0,
        error: err.message,
        stack: err.stack?.split("\n").slice(0, 6).join("\n"),
      };
    }
  }

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
