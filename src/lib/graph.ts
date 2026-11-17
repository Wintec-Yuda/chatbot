import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { getDb } from "./db";
import { getFaq, searchFaqs, type FaqHit } from "./search";
import { classify, intentThreshold } from "./intent";

/* ───────────── Model ───────────── */

// Model kecil & cepat untuk analisis/penilaian, model besar untuk menulis jawaban.
// Bisa diganti lewat env tanpa ubah kode kalau Groq menghentikan suatu model.
// reasoningEffort "low": gpt-oss berpikir dulu sebelum menjawab; dibuat singkat supaya cepat & hemat kuota.
const fast = () =>
  new ChatGroq({
    model: process.env.GROQ_MODEL_FAST || "openai/gpt-oss-20b",
    temperature: 0,
    reasoningEffort: "low",
  });
const main = () =>
  new ChatGroq({
    model: process.env.GROQ_MODEL_MAIN || "openai/gpt-oss-120b",
    temperature: 0.3,
    reasoningEffort: "low",
  });

// JSON schema ketat (didukung gpt-oss di Groq) lebih stabil daripada tool calling.
const structured = <T extends z.ZodType>(schema: T, name: string) =>
  // gpt-oss kadang mengeluarkan teks "berpikir" alih-alih JSON → ulangi sekali.
  fast()
    .withStructuredOutput(schema, { name, method: "jsonSchema" })
    .withRetry({ stopAfterAttempt: 2 })
    // Masih gagal → pakai model besar (lebih patuh format JSON).
    .withFallbacks([main().withStructuredOutput(schema, { name, method: "jsonSchema" })]);

/** Kuota habis jangan disamarkan jadi "oper ke CS" — biar route membalas "server sibuk". */
const rethrowRateLimit = (e: unknown) => {
  if ((e as { status?: number }).status === 429) throw e;
};

/* ───────────── Teks tetap ───────────── */

export const TEXT = {
  handoff:
    "Pertanyaanmu sudah kami teruskan ke **tim CS Cliploo**. Mohon tunggu sebentar ya, kamu akan segera disambungkan dengan CS. 🙏",
  sensitive:
    "Ini perlu ditangani langsung oleh **tim CS Cliploo**, jadi pertanyaanmu sudah kami teruskan. Mohon tunggu sebentar, kamu akan segera disambungkan.\n\n🔒 Sambil menunggu: Cliploo **tidak pernah** meminta kode OTP, password, PIN, atau data kartu. Jangan berikan kepada siapa pun, termasuk yang mengaku dari Cliploo.",
  smalltalk:
    "Hai! 👋 Aku asisten bantuan Cliploo. Ada yang bisa kubantu soal pesanan, pembayaran, pengiriman, pengembalian, voucher, atau jualan di Cliploo?",
  offtopic:
    "Maaf, aku hanya bisa membantu pertanyaan seputar **belanja dan jualan di Cliploo** — misalnya pembayaran, pengiriman, pengembalian, voucher, atau buka toko. Ada yang bisa kubantu soal itu? 😊",
};

// Kata yang langsung dioper ke CS walau ada FAQ-nya (idea: topik sensitif).
const SENSITIVE =
  /\b(ditipu|penipu(an)?|scam|dibobol|dihack|di-?hack|hacked|diretas|akun (diambil|dicuri)|uang (hilang|raib)|saldo (hilang|raib)|transaksi (aneh|tidak dikenal)|lapor polisi)\b/i;

// User minta langsung bicara dengan CS.
const WANTS_CS =
  /\b(hubungi|sambungkan|sambungin|bicara|ngomong|chat|ngobrol|minta|panggil)\s+(dengan\s+|ke\s+|sama\s+)?(cs|admin|customer service|manusia|orang|agen|petugas)\b/i;

/* ───────────── State ───────────── */

export type Outcome = "answer" | "smalltalk" | "clarify" | "offtopic" | "handoff";

const State = Annotation.Root({
  sessionId: Annotation<string>,
  history: Annotation<BaseMessage[]>, // pesan sebelumnya (tanpa pertanyaan terbaru)
  question: Annotation<string>,
  // hasil analisis
  intent: Annotation<string>,
  sensitive: Annotation<boolean>,
  standalone: Annotation<string>,
  keywords: Annotation<string>,
  // retrieval
  hits: Annotation<FaqHit[]>,
  relevant: Annotation<FaqHit[]>,
  attempts: Annotation<number>,
  // keluaran
  outcome: Annotation<Outcome>,
  answer: Annotation<string>,
  ticketId: Annotation<number | null>,
});
type S = typeof State.State;

/* ───────────── Node ───────────── */

const AnalyzeSchema = z.object({
  intent: z
    .enum(["smalltalk", "faq", "clarify", "offtopic"])
    .describe(
      "smalltalk = sapaan/terima kasih/basa-basi; faq = pertanyaan soal belanja/jualan/akun di Cliploo; clarify = soal Cliploo tapi terlalu ambigu untuk dicari; offtopic = di luar Cliploo",
    ),
  standalone: z
    .string()
    .describe("Pertanyaan terbaru ditulis ulang jadi kalimat utuh yang bisa dipahami tanpa riwayat chat"),
  keywords: z
    .string()
    .describe("5-10 kata kunci bahasa Indonesia baku + sinonim untuk mencari di FAQ, dipisah spasi"),
  clarifyQuestion: z
    .string()
    .describe("Jika intent=clarify: satu pertanyaan balik singkat yang menawarkan 2-3 kemungkinan maksud. Selain itu kosong."),
});

async function analyze(s: S): Promise<Partial<S>> {
  const sensitive = SENSITIVE.test(s.question);
  // Langsung ke CS tanpa memanggil LLM (hemat kuota).
  if (sensitive) return { intent: "sensitive", sensitive, standalone: s.question, keywords: "" };
  if (WANTS_CS.test(s.question)) return { intent: "cs", sensitive, standalone: s.question, keywords: "" };
  const recent = s.history
    .slice(-6)
    .map((m) => `${m.getType() === "human" ? "User" : "Bot"}: ${String(m.content).slice(0, 400)}`)
    .join("\n");

  try {
    const out = await structured(AnalyzeSchema, "analisis").invoke([
        new SystemMessage(
          "Kamu menganalisis pesan user untuk chatbot bantuan marketplace Cliploo (belanja lewat video & Live, toko, voucher, pembayaran, pengiriman, pengembalian, Garansi Ori, jualan). " +
            "Gunakan riwayat chat untuk memahami pertanyaan lanjutan seperti 'kalau yang COD gimana?'. " +
            "Pilih clarify HANYA bila pertanyaan benar-benar ambigu tanpa topik jelas (mis. 'barangku gimana?'). Keluhan yang menyebut topik (kw/palsu, telat, refund, voucher) = faq. " +
            "Jawab dalam bahasa Indonesia.",
        ),
        new HumanMessage(`Riwayat chat:\n${recent || "(kosong)"}\n\nPesan terbaru user: ${s.question}`),
      ]);
    const { clarifyQuestion, ...rest } = out;
    if (rest.intent === "clarify" && clarifyQuestion.trim()) {
      return { ...rest, sensitive, answer: clarifyQuestion.trim() };
    }
    return { ...rest, intent: rest.intent === "clarify" ? "faq" : rest.intent, sensitive };
  } catch (e) {
    rethrowRateLimit(e);
    // Model gagal memberi JSON yang valid → anggap pertanyaan FAQ biasa.
    console.warn("[analyze] fallback:", (e as Error).message);
    return { intent: "faq", sensitive, standalone: s.question, keywords: s.question };
  }
}

async function retrieve(s: S): Promise<Partial<S>> {
  const byKeywords = await searchFaqs(`${s.keywords} ${s.standalone}`, 6);
  const byOriginal = await searchFaqs(s.question, 4);
  const seen = new Set<number>();
  const hits = [...byKeywords, ...byOriginal].filter((h) => !seen.has(h.id) && seen.add(h.id));
  return { hits, attempts: (s.attempts ?? 0) + 1 };
}

const GradeSchema = z.object({
  relevantIds: z
    .array(z.number())
    .describe("ID FAQ yang BENAR-BENAR menjawab pertanyaan user. Kosong bila tidak ada yang menjawab."),
});

async function grade(s: S): Promise<Partial<S>> {
  if (s.hits.length === 0) return { relevant: [] };
  const list = s.hits
    .map((h) => `[${h.id}] T: ${h.question}\nJ: ${h.answer.slice(0, 300)}`)
    .join("\n\n");
  try {
    const out = await structured(GradeSchema, "penilaian").invoke([
        new SystemMessage(
          "Pilih FAQ yang isinya benar-benar menjawab pertanyaan user. Jangan pilih FAQ yang hanya mirip kata-katanya tapi membahas hal lain. " +
            "Jika user menanyakan detail spesifik (angka, batas, aturan) yang TIDAK tertulis di jawaban FAQ, jangan pilih FAQ itu. " +
            "Pertanyaan di luar Cliploo (resep, berita, tokoh, dll) → kosong. Maksimal 3.",
        ),
        new HumanMessage(`Pertanyaan: ${s.standalone}\n\nFAQ kandidat:\n${list}`),
      ]);
    const ids = new Set(out.relevantIds);
    return { relevant: s.hits.filter((h) => ids.has(h.id)).slice(0, 3) };
  } catch (e) {
    rethrowRateLimit(e);
    // Lebih aman oper ke CS daripada menjawab dengan FAQ yang belum tentu cocok.
    console.warn("[grade] fallback:", (e as Error).message);
    return { relevant: [] };
  }
}

const ExpandSchema = z.object({
  keywords: z.string().describe("Kata kunci BARU (sinonim, istilah resmi marketplace) dipisah spasi"),
});

async function expand(s: S): Promise<Partial<S>> {
  try {
    const out = await structured(ExpandSchema, "kata_kunci").invoke([
        new SystemMessage(
          "Pencarian FAQ marketplace gagal. Beri kata kunci alternatif: sinonim, istilah resmi (mis. 'nyampe' → 'sampai diterima pengiriman', 'balikin duit' → 'pengembalian dana refund').",
        ),
        new HumanMessage(`Pertanyaan: ${s.standalone}\nKata kunci sebelumnya: ${s.keywords}`),
      ]);
    return { keywords: out.keywords };
  } catch (e) {
    rethrowRateLimit(e);
    return { keywords: s.question };
  }
}

async function generate(s: S): Promise<Partial<S>> {
  const faqText = s.relevant
    .map((h) => `### ${h.categoryName} — ${h.question}\n${h.answer}`)
    .join("\n\n");
  const res = await main().invoke([
    new SystemMessage(
      `Kamu asisten bantuan resmi Cliploo. Gaya bahasa: santai tapi sopan, pakai "kamu", singkat dan jelas.
Aturan:
- Jawab HANYA berdasarkan FAQ di bawah. Jangan mengarang kebijakan, angka, atau menu yang tidak ada di FAQ.
- Tulis nama menu/tombol PERSIS seperti di FAQ (mis. **Pesanan Saya**). Jangan menambah langkah atau menu yang tidak tertulis.
- Gunakan markdown: langkah bernomor untuk cara, **tebal** untuk nama menu/tombol.
- Kalau FAQ hanya menjawab sebagian, jawab bagian itu lalu tawarkan: "Kalau masih ada kendala, ketik *hubungi CS* ya."
- HANYA kalau topiknya login, OTP, password, atau akun diretas, tambahkan pengingat singkat bahwa Cliploo tidak pernah meminta OTP/password. Selain itu jangan.
- Jangan menyebut kata "FAQ" atau "dokumen".

FAQ:
${faqText}`,
    ),
    ...s.history.slice(-6),
    new HumanMessage(s.question),
  ]);
  return { outcome: "answer", answer: String(res.content) };
}

async function smalltalk(s: S): Promise<Partial<S>> {
  const res = await main().invoke([
    new SystemMessage(
      "Kamu asisten bantuan Cliploo. Balas sapaan/basa-basi user dengan hangat dalam 1-2 kalimat, lalu tawarkan bantuan seputar belanja atau jualan di Cliploo. Jangan menjawab pertanyaan lain.",
    ),
    ...s.history.slice(-4),
    new HumanMessage(s.question),
  ]);
  return { outcome: "smalltalk", answer: String(res.content) };
}

async function clarify(s: S): Promise<Partial<S>> {
  return { outcome: "clarify", answer: s.answer };
}

async function offtopic(): Promise<Partial<S>> {
  return { outcome: "offtopic", answer: TEXT.offtopic };
}

async function handoff(s: S): Promise<Partial<S>> {
  const reason = s.sensitive ? "sensitif" : s.intent === "cs" ? "minta_cs" : "tidak_ada_di_faq";
  const transcript = JSON.stringify([
    ...s.history.map((m) => ({ role: m.getType() === "human" ? "user" : "bot", text: String(m.content) })),
    { role: "user", text: s.question },
  ]);
  let ticketId: number | null = null;
  try {
    const r = await getDb().execute({
      sql: "INSERT INTO handoff_requests (session_id, question, reason, transcript) VALUES (?, ?, ?, ?)",
      args: [s.sessionId, s.question, reason, transcript],
    });
    ticketId = Number(r.lastInsertRowid);
  } catch (e) {
    console.error("[handoff] gagal simpan:", e);
  }
  return { outcome: "handoff", answer: s.sensitive ? TEXT.sensitive : TEXT.handoff, ticketId };
}

/* ───────────── Rangkaian ───────────── */

const afterAnalyze = (s: S) => {
  if (s.sensitive || s.intent === "cs") return "handoff";
  if (s.answer && s.intent === "clarify") return "clarify";
  if (s.intent === "smalltalk") return "smalltalk";
  if (s.intent === "offtopic") return "offtopic";
  return "retrieve";
};

const afterGrade = (s: S) => {
  if (s.relevant.length > 0) return "generate";
  if (s.attempts < 2) return "expand"; // coba sekali lagi dengan kata kunci lain
  return "handoff";
};

/* ───────────── Mode model sendiri (dipilih lewat switch di UI) ───────────── */

// Classifier hasil training (training/train_intent.py) menggantikan analyze+retrieve+grade.
async function classifyNode(s: S): Promise<Partial<S>> {
  const sensitive = SENSITIVE.test(s.question);
  if (sensitive) return { intent: "sensitive", sensitive };
  if (WANTS_CS.test(s.question)) return { intent: "cs", sensitive };
  const { label, score } = await classify(s.question);
  // Ragu → oper ke CS daripada menjawab salah.
  const intent = score < intentThreshold() ? "handoff" : label;
  console.log(`[intent] ${label} ${score.toFixed(2)} → ${intent}`);
  return { intent, sensitive, standalone: s.question };
}

async function faqAnswer(s: S): Promise<Partial<S>> {
  const faq = await getFaq(Number(s.intent.slice(4)));
  if (!faq) return { relevant: [] };
  return { outcome: "answer", answer: faq.answer, relevant: [faq] };
}

async function smalltalkFixed(): Promise<Partial<S>> {
  return { outcome: "smalltalk", answer: TEXT.smalltalk };
}

// Opsional: jawaban FAQ dirangkai ulang oleh Groq (HF_POLISH=1 + GROQ_API_KEY).
const polish = () => process.env.HF_POLISH === "1" && !!process.env.GROQ_API_KEY;

const hfGraph = new StateGraph(State)
  .addNode("classify", classifyNode)
  .addNode("faq", faqAnswer)
  .addNode("generate", generate)
  .addNode("smalltalk", smalltalkFixed)
  .addNode("offtopic", offtopic)
  .addNode("handoff", handoff)
  .addEdge(START, "classify")
  .addConditionalEdges(
    "classify",
    (s: S) =>
      s.intent.startsWith("faq:") ? "faq" : s.intent === "smalltalk" ? "smalltalk" : s.intent === "offtopic" ? "offtopic" : "handoff",
    ["faq", "smalltalk", "offtopic", "handoff"],
  )
  .addConditionalEdges("faq", (s: S) => (s.relevant.length === 0 ? "handoff" : polish() ? "generate" : END), [
    "handoff",
    "generate",
    END,
  ])
  .addEdge("generate", END)
  .addEdge("smalltalk", END)
  .addEdge("offtopic", END)
  .addEdge("handoff", END)
  .compile();

/* ───────────── Mode Groq (default) ───────────── */

const groqGraph = new StateGraph(State)
  .addNode("analyze", analyze)
  .addNode("retrieve", retrieve)
  .addNode("grade", grade)
  .addNode("expand", expand)
  .addNode("generate", generate)
  .addNode("smalltalk", smalltalk)
  .addNode("clarify", clarify)
  .addNode("offtopic", offtopic)
  .addNode("handoff", handoff)
  .addEdge(START, "analyze")
  .addConditionalEdges("analyze", afterAnalyze, ["handoff", "clarify", "smalltalk", "offtopic", "retrieve"])
  .addEdge("retrieve", "grade")
  .addConditionalEdges("grade", afterGrade, ["generate", "expand", "handoff"])
  .addEdge("expand", "retrieve")
  .addEdge("generate", END)
  .addEdge("smalltalk", END)
  .addEdge("clarify", END)
  .addEdge("offtopic", END)
  .addEdge("handoff", END)
  .compile();

export type Provider = "groq" | "hf";
export const PROVIDERS: Provider[] = ["groq", "hf"];
export const getGraph = (provider: Provider = "groq") => (provider === "hf" ? hfGraph : groqGraph);

/** Node yang token-nya di-stream ke browser. */
export const STREAMED_NODES = new Set(["generate", "smalltalk"]);

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function toInput(sessionId: string, turns: ChatTurn[]) {
  const last = turns[turns.length - 1];
  const history = turns
    .slice(0, -1)
    .map((t) => (t.role === "user" ? new HumanMessage(t.content) : new AIMessage(t.content)));
  return {
    sessionId,
    history,
    question: last.content,
    attempts: 0,
    answer: "",
    hits: [],
    relevant: [],
    ticketId: null,
  };
}
