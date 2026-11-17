import { getDb } from "@/lib/db";
import { classify } from "@/lib/intent";

export const maxDuration = 60;

/**
 * GET /api/health          — cek DB + env Groq
 * GET /api/health?check=hf — sekalian coba muat model Cliploo (Hugging Face)
 * Tidak menampilkan nilai env/token.
 */
export async function GET(req: Request) {
  const result: Record<string, unknown> = {
    runtime: `${process.platform}-${process.arch} node ${process.version}`,
    groq: {
      key: !!process.env.GROQ_API_KEY,
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

  if (new URL(req.url).searchParams.get("check") === "hf") {
    const t0 = Date.now();
    try {
      result.hf = { ok: true, sample: await classify("paket belum sampai"), ms: Date.now() - t0 };
    } catch (e) {
      const err = e as Error;
      result.hf = { ok: false, ms: Date.now() - t0, error: err.message };
    }
  }

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
