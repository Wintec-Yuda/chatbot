import { getDb } from "@/lib/db";

/**
 * GET /api/health — cek koneksi DB dan apakah env Groq terisi.
 * Tidak menampilkan nilai env/token.
 */
export async function GET() {
  const result: Record<string, unknown> = {
    mode: "groq",
    groqKey: !!process.env.GROQ_API_KEY,
    models: {
      fast: process.env.GROQ_MODEL_FAST || "openai/gpt-oss-20b",
      main: process.env.GROQ_MODEL_MAIN || "openai/gpt-oss-120b",
    },
  };

  try {
    const { rows } = await getDb().execute("SELECT COUNT(*) AS n FROM faqs");
    result.db = { ok: true, faqs: Number(rows[0].n) };
  } catch (e) {
    result.db = { ok: false, error: (e as Error).message };
  }

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
