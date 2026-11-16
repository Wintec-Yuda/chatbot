"""
Upload model hasil training ke Hugging Face Hub.

    HF_TOKEN=... training/.venv/bin/python training/push_hf.py <folder-model> <user/nama-repo> [--private]

Contoh:
    training/.venv/bin/python training/push_hf.py training/out/indobert-lite-base-p1 wintec-yuda/cliploo-faq-intent
(HF_TOKEN dibaca dari .env.local kalau tidak ada di environment.)
"""

import json
import os
import sys
from pathlib import Path

from huggingface_hub import HfApi

if len(sys.argv) < 3:
    sys.exit(__doc__)
folder, repo = Path(sys.argv[1]), sys.argv[2]
private = "--private" in sys.argv

token = os.environ.get("HF_TOKEN")
if not token:
    env = Path(__file__).parent.parent / ".env.local"
    for line in env.read_text().splitlines():
        if line.startswith("HF_TOKEN="):
            token = line.split("=", 1)[1].strip()
if not token:
    sys.exit("HF_TOKEN belum diisi di .env.local")

info = json.loads((folder / "cliploo.json").read_text())
cfg = json.loads((folder / "config.json").read_text())
labels = list(cfg["id2label"].values())

(folder / "README.md").write_text(
    f"""---
language: id
library_name: transformers.js
pipeline_tag: text-classification
base_model: {info['base']}
tags: [cliploo, intent-classification, faq, onnx]
---

# Cliploo FAQ Intent

Classifier pertanyaan pelanggan marketplace **Cliploo** (bahasa Indonesia), fine-tune dari `{info['base']}`.

Label ({len(labels)}): `faq:<id>` (pertanyaan yang dijawab FAQ nomor itu), `smalltalk`, `offtopic`, `handoff` (perlu CS).

| Metrik (test set {info['n_test']} contoh) | Nilai |
|---|---|
| Akurasi | {info['test_acc']:.3f} |
| Macro-F1 | {info['test_f1']:.3f} |
| Ambang keyakinan disarankan | {info['threshold']} |

Data latih: {info['n_train']} pertanyaan sintetis (variasi gaya bahasa dari 47 FAQ Cliploo).

## Pakai di Node.js (transformers.js)

```js
import {{ pipeline }} from "@huggingface/transformers";
const clf = await pipeline("text-classification", "{repo}", {{ dtype: "q8" }});
await clf("paket gw blm nyampe kak");  // [{{ label: "faq:13", score: 0.97 }}]
```
"""
)

api = HfApi(token=token)
api.create_repo(repo, private=private, exist_ok=True)
# Ganti total isi repo (versi lama tetap ada di riwayat commit HF).
api.upload_folder(
    folder_path=str(folder),
    repo_id=repo,
    commit_message=f"Upload Cliploo FAQ intent model ({info['base']})",
    delete_patterns=["*.json", "*.txt", "*.safetensors", "*.bin", "*.model", "onnx/*", "README.md"],
)
print(f"✓ https://huggingface.co/{repo}")
