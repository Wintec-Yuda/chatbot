import { getDb } from "./db";

export type FaqHit = {
  id: number;
  category: string;
  categoryName: string;
  question: string;
  answer: string;
  score: number;
};

// Kata umum yang tidak membantu pencarian.
const STOPWORDS = new Set(
  `yang di ke dari dan atau untuk dengan ini itu ada apa apakah bagaimana gimana gmn cara kenapa
  mengapa kapan berapa saya aku gue gw kamu bisa tidak gak ga nggak enggak sudah udah belum
  mau ingin tolong dong deh sih kok ya kak min admin cliploo nya kah lah juga lagi jadi
  harus pada oleh akan buat bikin`
    .split(/\s+/)
    .filter(Boolean),
);

/** Ubah teks bebas → query FTS5 aman: token OR token* … */
export function toFtsQuery(text: string): string | null {
  const tokens = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  const unique = [...new Set(tokens)].slice(0, 16);
  if (unique.length === 0) return null;
  return unique.map((t) => `"${t}"*`).join(" OR ");
}

export async function searchFaqs(text: string, limit = 5): Promise<FaqHit[]> {
  const match = toFtsQuery(text);
  if (!match) return [];
  // bm25: bobot pertanyaan & kata kunci lebih tinggi dari isi jawaban. Makin kecil makin relevan.
  const { rows } = await getDb().execute({
    sql: `SELECT f.id, f.category, c.name AS category_name, f.question, f.answer,
                 bm25(faqs_fts, 4.0, 1.0, 3.0) AS score
          FROM faqs_fts
          JOIN faqs f ON f.id = faqs_fts.rowid
          JOIN categories c ON c.slug = f.category
          WHERE faqs_fts MATCH ?
          ORDER BY score
          LIMIT ?`,
    args: [match, limit],
  });
  return rows.map((r) => ({
    id: Number(r.id),
    category: String(r.category),
    categoryName: String(r.category_name),
    question: String(r.question),
    answer: String(r.answer),
    score: Number(r.score),
  }));
}
