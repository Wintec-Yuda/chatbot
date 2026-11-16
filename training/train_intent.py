"""
Latih classifier intent Cliploo dari training/dataset.jsonl, lalu export ke ONNX (+ versi int8).

    training/.venv/bin/python training/train_intent.py
    BASE=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 training/.venv/bin/python training/train_intent.py

Hasil: training/out/<nama>/  → siap di-push ke Hugging Face (lihat push_hf.py).
Bisa juga dijalankan di Google Colab (GPU otomatis dipakai kalau ada).
"""

import json
import os
import random
import shutil
from collections import Counter
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import train_test_split
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)

BASE = os.environ.get("BASE", "indobenchmark/indobert-lite-base-p1")
EPOCHS = float(os.environ.get("EPOCHS", 10))
LR = float(os.environ.get("LR", 5e-5))
SEED = 42
ROOT = Path(__file__).parent
OUT = ROOT / "out" / BASE.split("/")[-1]

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

# ── Data ────────────────────────────────────────────────────────────────
rows = [json.loads(l) for l in (ROOT / "dataset.jsonl").read_text().splitlines() if l.strip()]
labels = sorted({r["label"] for r in rows}, key=lambda l: (not l.startswith("faq:"), int(l[4:]) if l.startswith("faq:") else 0, l))
label2id = {l: i for i, l in enumerate(labels)}
id2label = {i: l for l, i in label2id.items()}
print(f"{len(rows)} contoh, {len(labels)} label · base={BASE}")
print("terkecil:", Counter(r["label"] for r in rows).most_common()[-3:])

train, test = train_test_split(rows, test_size=0.15, random_state=SEED, stratify=[r["label"] for r in rows])

# IndoBERT-lite: modelnya ALBERT tapi tokenizer-nya BERT (vocab.txt) — lihat model card indobenchmark.
if "indobert-lite" in BASE:
    from transformers import BertTokenizerFast

    tok = BertTokenizerFast.from_pretrained(BASE)
else:
    tok = AutoTokenizer.from_pretrained(BASE)


class DS(torch.utils.data.Dataset):
    def __init__(self, items):
        self.enc = tok([r["text"] for r in items], truncation=True, max_length=64)
        self.y = [label2id[r["label"]] for r in items]

    def __len__(self):
        return len(self.y)

    def __getitem__(self, i):
        item = {k: v[i] for k, v in self.enc.items()}
        item["labels"] = self.y[i]
        return item


model = AutoModelForSequenceClassification.from_pretrained(
    BASE, num_labels=len(labels), id2label=id2label, label2id=label2id
)


def metrics(p):
    pred = p.predictions.argmax(-1)
    return {"acc": float((pred == p.label_ids).mean()), "f1": f1_score(p.label_ids, pred, average="macro")}


args = TrainingArguments(
    output_dir=str(ROOT / "out" / "_ckpt"),
    num_train_epochs=EPOCHS,
    learning_rate=LR,
    per_device_train_batch_size=32,
    per_device_eval_batch_size=64,
    warmup_ratio=0.1,
    weight_decay=0.01,
    eval_strategy="epoch",
    save_strategy="epoch",
    save_total_limit=1,
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    logging_steps=20,
    report_to=[],
    seed=SEED,
    use_cpu=not torch.cuda.is_available(),
)
trainer = Trainer(
    model=model,
    args=args,
    train_dataset=DS(train),
    eval_dataset=DS(test),
    data_collator=DataCollatorWithPadding(tok),
    compute_metrics=metrics,
)
trainer.train()

# ── Evaluasi & ambang keyakinan ────────────────────────────────────────
pred = trainer.predict(DS(test))
probs = torch.softmax(torch.tensor(pred.predictions), -1).numpy()
y_pred, y_true = probs.argmax(-1), pred.label_ids
print(classification_report(y_true, y_pred, labels=list(range(len(labels))), target_names=labels, zero_division=0))

# Ambang: di bawah nilai ini jawaban dianggap ragu → oper ke CS.
conf = probs.max(-1)
best = (0.0, 0.0)
for t in np.arange(0.2, 0.95, 0.05):
    # tebakan yakin & benar, + tebakan ragu yang memang salah (aman dioper ke CS)
    score = ((conf >= t) & (y_pred == y_true)).mean() + ((conf < t) & (y_pred != y_true)).mean()
    if score > best[1]:
        best = (float(round(t, 2)), float(score))
print(f"ambang keyakinan disarankan: {best[0]}")

# ── Simpan + ONNX ──────────────────────────────────────────────────────
if OUT.exists():
    shutil.rmtree(OUT)
trainer.save_model(str(OUT))
tok.save_pretrained(str(OUT))
acc = float((y_pred == y_true).mean())
f1 = f1_score(y_true, y_pred, average="macro")
(OUT / "cliploo.json").write_text(
    json.dumps({"base": BASE, "threshold": best[0], "test_acc": acc, "test_f1": f1, "n_train": len(train), "n_test": len(test)}, indent=2)
)

from optimum.onnxruntime import ORTModelForSequenceClassification, ORTQuantizer
from optimum.onnxruntime.configuration import AutoQuantizationConfig

onnx_dir = OUT / "onnx"
ORTModelForSequenceClassification.from_pretrained(str(OUT), export=True).save_pretrained(str(onnx_dir))
ORTQuantizer.from_pretrained(str(onnx_dir)).quantize(
    save_dir=str(onnx_dir), quantization_config=AutoQuantizationConfig.avx2(is_static=False, per_channel=False)
)
# Susunan file yang diharapkan transformers.js: onnx/model.onnx + onnx/model_quantized.onnx
for f in onnx_dir.iterdir():
    if f.suffix != ".onnx":
        f.unlink()
for f in onnx_dir.glob("*.onnx"):
    print(f"  {f.name}: {f.stat().st_size / 1e6:.1f} MB")
shutil.rmtree(ROOT / "out" / "_ckpt", ignore_errors=True)
print(f"\n✓ test acc {acc:.3f} · macro-F1 {f1:.3f} → {OUT}")
