/**
 * Classifier intent hasil training sendiri (training/train_intent.py), dijalankan lokal
 * lewat transformers.js (ONNX, CPU). Tidak butuh API key kalau repo HF-nya publik.
 *
 * Dipakai saat user memilih "Model Cliploo" di switch UI (provider "hf").
 *   HF_INTENT_MODEL=wintec-yuda/cliploo-faq-intent   (repo HF, atau path folder lokal)
 *   HF_INTENT_THRESHOLD=0.2                          (opsional; di bawah ini → oper ke CS)
 */
import type { TextClassificationPipeline } from "@huggingface/transformers";

export type Intent = { label: string; score: number };

let clf: Promise<TextClassificationPipeline> | null = null;

export class ModelUnavailableError extends Error {}

async function load(): Promise<TextClassificationPipeline> {
  // onnxruntime-node tidak punya binary Mac Intel — gagal lebih awal dengan pesan jelas.
  if (process.platform === "darwin" && process.arch === "x64") {
    throw new ModelUnavailableError("Model Cliploo tidak bisa dijalankan di Mac Intel. Coba di versi Vercel.");
  }
  const { pipeline, env } = await import("@huggingface/transformers");
  const id = process.env.HF_INTENT_MODEL || "alamasta999/cliploo-faq-intent";
  const local = id.startsWith(".") || id.startsWith("/") || id.startsWith("training/");
  env.allowLocalModels = local;
  env.allowRemoteModels = !local;
  if (local) env.localModelPath = "";
  // Di Vercel hanya /tmp yang bisa ditulis.
  env.cacheDir = process.env.VERCEL ? "/tmp/hf-cache" : "./.cache/hf";
  return (await pipeline("text-classification", id, { dtype: "q8" })) as TextClassificationPipeline;
}

export async function classify(text: string): Promise<Intent> {
  clf ??= load().catch((e) => {
    clf = null; // biar request berikutnya mencoba lagi
    throw e;
  });
  const out = (await (await clf)(text.slice(0, 500), { top_k: 1 })) as Intent[];
  return out[0];
}

export function intentThreshold(): number {
  // MiniLM v2 memberi skor rendah walau benar (~0,4); 0,2 = saran script training (cliploo.json).
  return Number(process.env.HF_INTENT_THRESHOLD) || 0.2;
}
