---
title: Cliploo Intent API
emoji: 💬
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

API classifier pertanyaan pelanggan Cliploo (model `alamasta999/cliploo-faq-intent`).

```bash
curl -X POST https://alamasta999-cliploo-intent-api.hf.space/classify \
  -H 'Content-Type: application/json' -d '{"text":"paket gw blm nyampe"}'
```
