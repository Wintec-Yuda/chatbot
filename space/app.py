"""
API classifier intent Cliploo — jalan di Hugging Face Space (Docker, CPU gratis).

    POST /classify  {"text": "paket gw blm nyampe"}  →  {"label": "faq:13", "score": 0.42}
    GET  /          → status

Model diunduh dari repo HF saat start (MODEL_REPO, default alamasta999/cliploo-faq-intent).
"""

import json
import os
import time

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI
from huggingface_hub import hf_hub_download
from pydantic import BaseModel, Field
from tokenizers import Tokenizer

REPO = os.environ.get("MODEL_REPO", "alamasta999/cliploo-faq-intent")
ONNX_FILE = os.environ.get("ONNX_FILE", "onnx/model_quantized.onnx")

t0 = time.time()
tok = Tokenizer.from_file(hf_hub_download(REPO, "tokenizer.json"))
tok.enable_truncation(max_length=64)
cfg = json.load(open(hf_hub_download(REPO, "config.json")))
id2label = {int(k): v for k, v in cfg["id2label"].items()}
sess = ort.InferenceSession(hf_hub_download(REPO, ONNX_FILE), providers=["CPUExecutionProvider"])
inputs = {i.name for i in sess.get_inputs()}
LOAD_SEC = round(time.time() - t0, 2)

app = FastAPI(title="Cliploo Intent API")


class Req(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


@app.get("/")
def status():
    return {"ok": True, "model": REPO, "labels": len(id2label), "load_sec": LOAD_SEC}


@app.post("/classify")
def classify(req: Req):
    e = tok.encode(req.text)
    feed = {
        "input_ids": np.array([e.ids], dtype=np.int64),
        "attention_mask": np.array([e.attention_mask], dtype=np.int64),
        "token_type_ids": np.array([e.type_ids], dtype=np.int64),
    }
    logits = sess.run(None, {k: v for k, v in feed.items() if k in inputs})[0][0]
    p = np.exp(logits - logits.max())
    p /= p.sum()
    i = int(p.argmax())
    return {"label": id2label[i], "score": float(p[i])}
