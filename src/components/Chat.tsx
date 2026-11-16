"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatEvent } from "@/app/api/chat/route";

type Source = { id: number; category: string; question: string };
type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  outcome?: string;
  sources?: Source[];
  ticketId?: number | null;
  error?: boolean;
};

const STORE_KEY = "cliploo-chat-v1";

const SUGGESTIONS = [
  "Pesananku belum sampai",
  "Kapan dana refund masuk?",
  "Cara mengajukan pengembalian",
  "Kenapa tidak bisa bayar COD?",
  "Cara pakai voucher",
  "Cara buka toko di Cliploo",
];

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false); // sebelum token pertama tiba
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Muat riwayat dari browser.
  useEffect(() => {
    let saved: { sessionId?: string; messages?: Msg[] } = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sekali saat mount, dari localStorage
    setSessionId(saved.sessionId || uid());
    setMessages((saved.messages || []).filter((m) => !m.error));
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ sessionId, messages: messages.slice(-50) }));
    } catch {}
  }, [sessionId, messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waiting]);

  async function send(text: string, base: Msg[] = messages) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");

    const userMsg: Msg = { id: uid(), role: "user", content };
    const botId = uid();
    const history = [...base.filter((m) => !m.error), userMsg];
    setMessages([...history, { id: botId, role: "assistant", content: "" }]);
    setBusy(true);
    setWaiting(true);

    const patch = (p: Partial<Msg>) =>
      setMessages((all) => all.map((m) => (m.id === botId ? { ...m, ...p } : m)));
    const append = (t: string) =>
      setMessages((all) => all.map((m) => (m.id === botId ? { ...m, content: m.content + t } : m)));

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menghubungi server.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as ChatEvent;
          if (ev.type === "token") {
            setWaiting(false);
            append(ev.text);
          } else if (ev.type === "final") {
            setWaiting(false);
            patch({ content: ev.text, outcome: ev.outcome, sources: ev.sources, ticketId: ev.ticketId });
          } else if (ev.type === "error") {
            throw new Error(ev.message);
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setMessages((all) => all.filter((m) => m.id !== botId || m.content));
      } else {
        patch({ content: (e as Error).message, error: true });
      }
    } finally {
      setBusy(false);
      setWaiting(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    send(lastUser.content, messages.slice(0, messages.lastIndexOf(lastUser)));
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(uid());
    setInput("");
  }

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-lg font-bold text-brand-ink">
          C
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold leading-tight">Bantuan Cliploo</h1>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <span className="size-2 rounded-full bg-emerald-500" /> Asisten otomatis · balas instan
          </p>
        </div>
        {!empty && (
          <button
            onClick={newChat}
            className="rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
          >
            Chat baru
          </button>
        )}
      </header>

      {/* Pesan */}
      <main className="flex-1 overflow-y-auto px-4 py-5">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-brand-soft text-3xl">💬</div>
            <h2 className="mt-4 text-lg font-semibold">Hai! Ada yang bisa dibantu?</h2>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Tanya soal pesanan, pembayaran, pengiriman, pengembalian, voucher, atau jualan di Cliploo.
            </p>
            <div className="mt-6 flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-surface px-3.5 py-2 text-sm hover:border-brand hover:text-brand"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => (
              <li key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[15px] text-brand-ink">
                    {m.content}
                  </div>
                ) : (
                  <BotMessage msg={m} waiting={waiting && !m.content} onRetry={retry} />
                )}
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </main>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-line bg-surface px-3 py-3"
      >
        <div className="flex items-end gap-2 rounded-3xl border border-line bg-bg px-3 py-1.5 focus-within:border-brand">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="Tulis pertanyaanmu…"
            aria-label="Pesan"
            className="field-sizing-content max-h-36 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[15px] outline-none placeholder:text-muted"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              aria-label="Hentikan"
              className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink"
            >
              <span className="size-3 rounded-sm bg-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Kirim"
              className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-brand text-brand-ink disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">
          Cliploo tidak pernah meminta OTP atau password. Jawaban otomatis bisa keliru.
        </p>
      </form>
    </div>
  );
}

function BotMessage({ msg, waiting, onRetry }: { msg: Msg; waiting: boolean; onRetry: () => void }) {
  const [copied, setCopied] = useState(false);

  if (waiting) {
    return (
      <div className="flex gap-1 rounded-2xl rounded-bl-md bg-surface px-4 py-3.5" aria-label="Sedang mengetik">
        <span className="dot size-2 rounded-full bg-muted" />
        <span className="dot size-2 rounded-full bg-muted" />
        <span className="dot size-2 rounded-full bg-muted" />
      </div>
    );
  }

  if (msg.error) {
    return (
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-red-300/50 bg-red-500/10 px-4 py-2.5 text-[15px]">
        <p>{msg.content}</p>
        <button onClick={onRetry} className="mt-1.5 text-sm font-medium text-brand">
          Coba lagi
        </button>
      </div>
    );
  }

  const handoff = msg.outcome === "handoff";

  return (
    <div className="max-w-[85%] space-y-2">
      <div className="rounded-2xl rounded-bl-md bg-surface px-4 py-2.5 text-[15px] leading-relaxed">
        <div className="md">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>
      </div>

      {handoff && (
        <div className="flex items-center gap-2.5 rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm text-warn">
          <span className="flex gap-0.5">
            <span className="dot size-1.5 rounded-full bg-current" />
            <span className="dot size-1.5 rounded-full bg-current" />
            <span className="dot size-1.5 rounded-full bg-current" />
          </span>
          <span className="font-medium">Menunggu CS menyambungkan</span>
          {msg.ticketId ? <span className="ml-auto opacity-80">Tiket #{msg.ticketId}</span> : null}
        </div>
      )}

      {msg.outcome && msg.content && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted">
          {msg.sources?.map((s) => (
            <span key={s.id} title={s.question} className="inline-flex items-center gap-1">
              📄 {s.category}
            </span>
          ))}
          <button
            onClick={() => {
              navigator.clipboard?.writeText(msg.content).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="hover:text-ink"
          >
            {copied ? "Tersalin ✓" : "Salin"}
          </button>
        </div>
      )}
    </div>
  );
}
