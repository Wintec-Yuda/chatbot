/**
 * npm run eval — uji kualitas chatbot dengan pertanyaan contoh.
 * Jalankan setiap kali QnA, prompt, atau model diubah. Butuh GROQ_API_KEY di .env.local.
 * Catatan: tiap kasus memakai 2–4 panggilan Groq, perhatikan kuota.
 */
import { getGraph, toInput, type Outcome } from "../src/lib/graph";

type Case = { q: string; history?: string[]; outcome: Outcome; category?: string };

const CASES: Case[] = [
  { q: "halo kak", outcome: "smalltalk" },
  { q: "makasih ya", outcome: "smalltalk" },
  { q: "paket aku belum nyampe nih padahal udah lewat estimasi", outcome: "answer", category: "Pengiriman" },
  { q: "cara lacak paket gimana", outcome: "answer", category: "Pengiriman" },
  { q: "kapan duit refund masuk?", outcome: "answer", category: "Pengembalian & Dana" },
  { q: "batas waktu retur berapa hari", outcome: "answer", category: "Pengembalian & Dana" },
  { q: "kok gak bisa cod", outcome: "answer", category: "Pembayaran" },
  { q: "bisa bayar pake dana ga", outcome: "answer", category: "Pembayaran" },
  { q: "voucher ku ga bisa dipake", outcome: "answer", category: "Voucher & Promo" },
  { q: "gimana caranya jadi seller", outcome: "answer", category: "Jualan di Cliploo" },
  { q: "barang yang aku terima kayaknya kw", outcome: "answer", category: "Garansi 100% Ori" },
  { q: "otp ga masuk masuk", outcome: "answer", category: "Akun" },
  {
    q: "kalau yang COD gimana?",
    history: ["metode pembayaran apa aja?", "Cliploo menerima dompet digital, QRIS, VA, kartu, PayLater, gerai, dan COD."],
    outcome: "answer",
    category: "Pembayaran",
  },
  { q: "barangku gimana?", outcome: "clarify" },
  { q: "resep nasi goreng dong", outcome: "offtopic" },
  { q: "siapa presiden indonesia", outcome: "offtopic" },
  { q: "bisa ganti nama toko berapa kali?", outcome: "handoff" },
  { q: "aku ditipu penjual, uang hilang", outcome: "handoff" },
  { q: "hubungi cs dong", outcome: "handoff" },
  { q: "akunku dibobol orang", outcome: "handoff" },
];

async function main() {
  const graph = getGraph();
  console.log(`mode: ${process.env.INTENT_PROVIDER === "hf" ? "hf (model sendiri)" : "groq"}\n`);
  if (process.env.INTENT_PROVIDER !== "hf" && !process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY belum diisi di .env.local");
    process.exit(1);
  }
  // Kuota gratis Groq ~8.000 token/menit → beri jeda antar kasus (ubah lewat EVAL_DELAY_MS).
  const delay = Number(process.env.EVAL_DELAY_MS ?? (process.env.INTENT_PROVIDER === "hf" ? 0 : 7000));
  let pass = 0;
  for (const [i, c] of CASES.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, delay));
    const turns = [
      ...(c.history ?? []).map((content, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content })),
      { role: "user" as const, content: c.q },
    ];
    const t0 = Date.now();
    try {
      const out = await graph.invoke(toInput("eval", turns));
      const cats = (out.relevant ?? []).map((h) => h.categoryName);
      const ok = out.outcome === c.outcome && (!c.category || cats.includes(c.category));
      if (ok) pass++;
      console.log(
        `${ok ? "✅" : "❌"} ${c.q}\n   harap: ${c.outcome}${c.category ? ` (${c.category})` : ""} · dapat: ${out.outcome}${cats.length ? ` (${cats.join(", ")})` : ""} · ${Date.now() - t0}ms`,
      );
    } catch (e) {
      console.log(`💥 ${c.q}\n   ${(e as Error).message}`);
    }
  }
  console.log(`\n${pass}/${CASES.length} lolos`);
  process.exit(pass === CASES.length ? 0 : 1);
}

main();
