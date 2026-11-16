/**
 * npm run db:seed — buat tabel lalu isi ulang kategori & QnA dari src/data/faqs.ts.
 * Aman dijalankan berkali-kali. Tabel handoff_requests tidak disentuh.
 */
import { CATEGORIES, FAQS } from "../src/data/faqs";
import { getDb, SCHEMA } from "../src/lib/db";

async function main() {
  const db = getDb();
  for (const sql of SCHEMA) await db.execute(sql);

  await db.batch(
    [
      "DELETE FROM faqs",
      "DELETE FROM categories",
      ...CATEGORIES.map((c) => ({
        sql: "INSERT INTO categories (slug, name) VALUES (?, ?)",
        args: [c.slug, c.name],
      })),
      ...FAQS.map((f) => ({
        sql: "INSERT INTO faqs (id, category, question, answer, keywords) VALUES (?, ?, ?, ?, ?)",
        args: [f.id, f.category, f.question, f.answer, f.keywords],
      })),
      "INSERT INTO faqs_fts(faqs_fts) VALUES ('rebuild')",
    ],
    "write",
  );

  const { rows } = await db.execute("SELECT COUNT(*) AS n FROM faqs");
  console.log(`✓ ${CATEGORIES.length} kategori, ${rows[0].n} QnA → ${process.env.TURSO_DATABASE_URL || "file:local.db"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
