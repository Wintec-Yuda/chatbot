"""
Tes realistis: pertanyaan tulisan tangan (bukan sintetis) yang tidak ada di data latih.

    training/.venv/bin/python training/check.py training/out/<nama-model>
"""

import json
import sys

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

CASES = [
    ("Pesananku belum sampai", "faq:13"),
    ("paket gw blm nyampe kak", "faq:13"),
    ("Kapan dana refund masuk?", "faq:26"),
    ("kapan duit refund masuk", "faq:26"),
    ("Cara mengajukan pengembalian", "faq:24"),
    ("mau retur gmn", "faq:24"),
    ("Kenapa tidak bisa bayar COD?", "faq:7"),
    ("kok ga bisa cod sih", "faq:7"),
    ("Cara pakai voucher", "faq:34"),
    ("Cara buka toko di Cliploo", "faq:40"),
    ("gimana caranya jadi seller", "faq:40"),
    ("otp ga masuk masuk", "faq:2"),
    ("barangnya kw nih", "faq:33"),
    ("produk yg aku terima kayaknya palsu", "faq:33"),
    ("cara lacak paket", "faq:12"),
    ("bisa bayar pake dana ga", "faq:6"),
    ("batas retur berapa hari", "faq:25"),
    ("voucher ga bisa dipake", "faq:35"),
    ("cara tarik saldo toko", "faq:42"),
    ("ganti alamat pengiriman", "faq:4"),
    ("cara batalin pesanan", "faq:21"),
    ("halo kak", "smalltalk"),
    ("makasih ya min", "smalltalk"),
    ("resep nasi goreng dong", "offtopic"),
    ("siapa presiden indonesia", "offtopic"),
    ("bisa ganti nama toko berapa kali?", "handoff"),
    ("aplikasi cliploo error terus pas dibuka", "handoff"),
    ("mau kerja sama iklan dengan cliploo", "handoff"),
]

d = sys.argv[1]
tok = Tokenizer.from_file(f"{d}/tokenizer.json")
cfg = json.load(open(f"{d}/config.json"))
sess = ort.InferenceSession(f"{d}/onnx/model_quantized.onnx")
names = [i.name for i in sess.get_inputs()]
threshold = json.load(open(f"{d}/cliploo.json")).get("threshold", 0.5)

ok = 0
for q, want in CASES:
    e = tok.encode(q)
    feed = {
        "input_ids": np.array([e.ids]),
        "attention_mask": np.array([e.attention_mask]),
        "token_type_ids": np.array([e.type_ids]),
    }
    lo = sess.run(None, {k: v for k, v in feed.items() if k in names})[0][0]
    p = np.exp(lo - lo.max())
    p /= p.sum()
    i = int(p.argmax())
    got = cfg["id2label"][str(i)]
    hit = got == want
    ok += hit
    print(f"{'✅' if hit else '❌'} {q:38} harap {want:9} dapat {got:9} {p[i]:.2f}")
print(f"\n{ok}/{len(CASES)} benar")
