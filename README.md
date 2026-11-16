# Chatbot Bantuan Cliploo

Chatbot FAQ Cliploo: **Next.js 16 + LangGraph.js + Groq + SQLite (libSQL/Turso)**.
Kalau jawabannya tidak ada di database, pertanyaan diteruskan ke CS: tersimpan di tabel `handoff_requests` dan user diberi tahu untuk menunggu.

## Jalankan lokal

```bash
npm install
cp .env.example .env.local   # isi GROQ_API_KEY
npm run db:seed              # buat local.db + isi 47 QnA
npm run dev                  # http://localhost:3000
```

## Alur LangGraph (`src/lib/graph.ts`)

```
analyze ─┬─ sensitif / minta CS ─────────────→ handoff
         ├─ sapaan ──────────────────────────→ smalltalk (stream)
         ├─ ambigu ──────────────────────────→ clarify (tanya balik)
         ├─ di luar Cliploo ─────────────────→ offtopic
         └─ FAQ → retrieve → grade ─┬─ relevan → generate (stream, + sumber)
                       ↑            ├─ belum   → expand (kata kunci baru) ─┘ (1x)
                                    └─ tetap tidak ada → handoff
```

- **analyze** (model cepat): klasifikasi intent + menulis ulang pertanyaan lanjutan jadi kalimat utuh + kata kunci.
- **retrieve**: SQLite FTS5 (bm25) di `src/lib/search.ts`.
- **grade** (model cepat): saring FAQ yang benar-benar menjawab.
- **generate** (model utama): jawab hanya dari FAQ, markdown.

## File penting

| File | Isi |
|---|---|
| `src/data/faqs.ts` | Kategori & QnA. Ubah di sini lalu `npm run db:seed` |
| `src/lib/graph.ts` | Graph LangGraph, prompt, teks tetap (handoff/offtopic) |
| `src/lib/search.ts` | Pencarian FTS5 |
| `src/app/api/chat/route.ts` | API streaming NDJSON + rate limit |
| `src/components/Chat.tsx` | UI chat |
| `scripts/eval.ts` | `npm run eval` — uji 20 pertanyaan contoh |

## Lihat pertanyaan yang dioper ke CS

```bash
sqlite3 local.db "SELECT id, reason, question, created_at FROM handoff_requests ORDER BY id DESC"
```

## Deploy ke Vercel

1. Buat DB di [Turso](https://turso.tech): `turso db create cliploo-chatbot`, lalu ambil URL (`turso db show --url`) dan token (`turso db tokens create`).
2. Isi DB Turso sekali dari laptop:
   ```bash
   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:seed
   ```
3. Push ke GitHub → import di Vercel → isi env `GROQ_API_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.

> SQLite file biasa tidak bisa dipakai di Vercel (filesystem tidak permanen), makanya pakai Turso.
