import { z } from "zod";
import { graph, STREAMED_NODES, toInput, type Outcome } from "@/lib/graph";
import { checkRateLimit } from "@/lib/rateLimit";
import type { FaqHit } from "@/lib/search";

export const maxDuration = 30;

const Body = z.object({
  sessionId: z.string().min(8).max(64),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40),
});

/**
 * Balasan berupa NDJSON (satu event JSON per baris):
 *   {"type":"token","text":"..."}         potongan jawaban (streaming)
 *   {"type":"final","outcome":..., "text":..., "sources":[...], "ticketId":...}
 *   {"type":"error","message":"..."}
 */
export type ChatEvent =
  | { type: "token"; text: string }
  | {
      type: "final";
      outcome: Outcome;
      text: string;
      sources: { id: number; category: string; question: string }[];
      ticketId: number | null;
    }
  | { type: "error"; message: string };

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = await checkRateLimit(ip);
  if (!rl.ok) {
    return Response.json(
      { error: `Terlalu banyak pesan. Coba lagi dalam ${Math.ceil(rl.retryAfterSec / 60)} menit ya.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: "GROQ_API_KEY belum diisi di .env.local" }, { status: 500 });
  }

  const { sessionId, messages } = parsed.data;
  // Batasi panjang riwayat yang dikirim ke model (hemat token).
  const turns = messages.slice(-10).map((m) => ({ ...m, content: m.content.slice(0, 1000) }));
  if (turns[turns.length - 1].role !== "user") {
    return Response.json({ error: "Pesan terakhir harus dari user" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: ChatEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      const final: { outcome?: Outcome; answer?: string; relevant?: FaqHit[]; ticketId?: number | null } = {};
      try {
        const events = await graph.stream(toInput(sessionId, turns), {
          streamMode: ["messages", "updates"],
          signal: req.signal,
        });
        for await (const [mode, chunk] of events) {
          if (mode === "messages") {
            const [msg, meta] = chunk as [{ content: unknown }, { langgraph_node?: string }];
            if (meta.langgraph_node && STREAMED_NODES.has(meta.langgraph_node) && typeof msg.content === "string" && msg.content) {
              send({ type: "token", text: msg.content });
            }
          } else {
            for (const update of Object.values(chunk as Record<string, Partial<typeof final>>)) {
              if (update) Object.assign(final, update);
            }
          }
        }
        send({
          type: "final",
          outcome: final.outcome ?? "handoff",
          text: final.answer ?? "",
          sources:
            final.outcome === "answer"
              ? (final.relevant ?? []).map((h) => ({ id: h.id, category: h.categoryName, question: h.question }))
              : [],
          ticketId: final.ticketId ?? null,
        });
      } catch (e) {
        console.error("[chat]", e);
        const status = (e as { status?: number }).status;
        send({
          type: "error",
          message:
            status === 429
              ? "Server sedang sibuk (kuota model habis). Coba lagi sebentar lagi ya."
              : "Maaf, terjadi gangguan. Coba kirim ulang pesanmu.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
