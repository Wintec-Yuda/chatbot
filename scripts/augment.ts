/**
 * npm run augment — buat dataset latih classifier di training/dataset.jsonl.
 *
 * Label:
 *   faq:<id>   → pertanyaan yang dijawab FAQ <id> (variasi gaya bahasa, typo, singkatan)
 *   smalltalk  → sapaan / terima kasih / basa-basi
 *   offtopic   → di luar Cliploo
 *   handoff    → soal Cliploo tapi TIDAK ada di FAQ, atau minta bicara dengan CS
 *
 * Pakai Groq (GROQ_MODEL_MAIN). Bisa dilanjutkan kalau terputus: label yang sudah ada dilewati.
 * Setelah selesai, cek dulu isinya — buang baris yang labelnya keliru.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { FAQS } from "../src/data/faqs";

const OUT = "training/dataset.jsonl";
const PER_FAQ = Number(process.env.AUGMENT_PER_FAQ ?? 30);

const model = new ChatGroq({
  model: process.env.GROQ_MODEL_MAIN || "openai/gpt-oss-120b",
  temperature: 1,
  reasoningEffort: "low",
}).withStructuredOutput(z.object({ questions: z.array(z.string()) }), {
  name: "pertanyaan",
  method: "jsonSchema",
});

const STYLE = `Variasikan gaya penulisan seperti user asli di aplikasi belanja Indonesia:
- campur: baku, santai, bahasa gaul (gw/aku/gimana/kok/udah/blm/gak), singkatan, typo ringan, tanpa tanda baca
- campur panjang: ada yang 2-3 kata, ada yang kalimat keluhan panjang dengan konteks
- sebagian pakai sapaan (kak, min, admin), sebagian langsung
- JANGAN menyalin kalimat contoh, dan jangan ada duplikat`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ask(system: string, user: string): Promise<string[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      const out = await model.invoke([new SystemMessage(system), new HumanMessage(user)]);
      return out.questions.map((q) => q.trim()).filter((q) => q.length >= 2 && q.length <= 300);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      if (attempt >= 6) throw e;
      // Kuota per menit habis → tunggu sesuai saran server.
      const wait = Number(/try again in ([\d.]+)s/.exec(err.message ?? "")?.[1] ?? 10);
      console.warn(`  ↻ ${err.status ?? "error"}, tunggu ${Math.ceil(wait + 1)}s`);
      await sleep((wait + 1) * 1000);
    }
  }
}

function save(label: string, texts: string[]) {
  const seen = new Set<string>();
  const rows = texts.filter((t) => {
    const k = t.toLowerCase();
    return !seen.has(k) && seen.add(k);
  });
  appendFileSync(OUT, rows.map((text) => JSON.stringify({ text, label })).join("\n") + "\n");
  return rows.length;
}

async function main() {
  mkdirSync("training", { recursive: true });
  const done = new Set(
    existsSync(OUT)
      ? readFileSync(OUT, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l).label as string)
      : [],
  );
  const faqList = FAQS.map((f) => `- ${f.question}`).join("\n");

  for (const f of FAQS) {
    const label = `faq:${f.id}`;
    if (done.has(label)) continue;
    const qs = await ask(
      `Kamu membuat data latih chatbot bantuan marketplace Cliploo. ${STYLE}`,
      `Buat ${PER_FAQ} cara berbeda user menanyakan hal yang jawabannya adalah FAQ ini.
Pertanyaan harus tetap SPESIFIK ke topik ini (jangan sampai bisa tertukar dengan FAQ lain).

FAQ: ${f.question}
Jawaban: ${f.answer}

FAQ lain yang JANGAN tertukar:
${FAQS.filter((o) => o.id !== f.id && o.category === f.category)
  .map((o) => `- ${o.question}`)
  .join("\n")}`,
    );
    console.log(`${label.padEnd(7)} +${save(label, [f.question, ...qs])}  ${f.question}`);
  }

  // Putaran 2: pesan PENDEK & gaul (2–6 kata) — tanpa ini model lemah di input singkat.
  const SHORT_DONE = "training/.short_done";
  const shortDone = new Set(existsSync(SHORT_DONE) ? readFileSync(SHORT_DONE, "utf8").split("\n") : []);
  for (const f of FAQS) {
    const label = `faq:${f.id}`;
    if (shortDone.has(label)) continue;
    const qs = await ask(
      `Kamu membuat data latih chatbot bantuan marketplace Cliploo.`,
      `Buat 15 pesan SANGAT PENDEK (2-6 kata) yang diketik user di kolom chat untuk topik FAQ ini.
Contoh gaya: "paket blm nyampe", "refund kapan masuk min", "ga bisa cod", "otp ga masuk", "pesananku belum sampai", "cara retur".
Campur: baku, gaul, singkatan (blm, gk, ga, gmn, udh, yg), typo, huruf kecil semua, tanpa tanda baca. Harus tetap spesifik ke topik ini.

FAQ: ${f.question}

Jangan sampai tertukar dengan:
${FAQS.filter((o) => o.id !== f.id && o.category === f.category)
  .map((o) => `- ${o.question}`)
  .join("\n")}`,
    );
    console.log(`${label.padEnd(7)} pendek +${save(label, qs.filter((q) => q.split(/\s+/).length <= 8))}`);
    appendFileSync(SHORT_DONE, label + "\n");
  }

  const groups: [string, number, string][] = [
    [
      "smalltalk",
      3,
      `Buat 30 pesan basa-basi ke chatbot: sapaan (halo, pagi kak, p, assalamualaikum), terima kasih, oke/siap, pamit, pujian, tanya kabar, "kamu bot ya?". Tanpa pertanyaan soal belanja.`,
    ],
    [
      "offtopic",
      4,
      `Buat 30 pertanyaan yang TIDAK berhubungan dengan belanja/jualan di Cliploo: resep, cuaca, berita, tokoh, PR sekolah, coding, kesehatan, olahraga, film, matematika, curhat, dll. Termasuk beberapa yang mirip belanja tapi bukan soal Cliploo (mis. "rekomendasi hp 2 jutaan", "bagusan beli di mall atau online").`,
    ],
    [
      "handoff",
      4,
      `Buat 30 pertanyaan soal Cliploo yang TIDAK terjawab oleh daftar FAQ di bawah (detail kebijakan lain, kasus khusus, masalah teknis aplikasi, pertanyaan tentang pesanan/akun tertentu yang butuh dicek manusia, kerja sama, karier, iklan, dll), DITAMBAH beberapa permintaan bicara langsung dengan CS/admin/manusia.

FAQ yang sudah ada (JANGAN buat pertanyaan yang dijawab ini):
${faqList}`,
    ],
  ];

  for (const [label, rounds, prompt] of groups) {
    if (done.has(label)) continue;
    const all: string[] = [];
    for (let i = 0; i < rounds; i++) {
      all.push(...(await ask(`Kamu membuat data latih chatbot bantuan marketplace Cliploo. ${STYLE}`, `${prompt}\n\n(Putaran ${i + 1}: buat yang berbeda dari biasanya.)`)));
    }
    console.log(`${label.padEnd(9)} +${save(label, all)}`);
  }

  const total = readFileSync(OUT, "utf8").split("\n").filter(Boolean).length;
  console.log(`\n✓ ${total} contoh → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
