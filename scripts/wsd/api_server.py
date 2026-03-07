"""
WSD API 서버 — FastAPI + ONNX Runtime

jinserver에서 실행:
  cd /home/jinwoo/wsd-data
  pip install fastapi uvicorn onnxruntime transformers
  python api_server.py

엔드포인트:
  POST /wsd
  Body: { "sentence": "문장", "words": ["단어1", "단어2"] }
  Response: { "results": { "단어1": "漢字", "단어2": null } }
"""

import json
import time
from pathlib import Path
from typing import Optional

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer

# 경로 설정
MODEL_DIR = Path("/home/jinwoo/wsd-data")
ONNX_PATH = MODEL_DIR / "onnx" / "wsd_encoder_int8.onnx"
HEADS_PATH = MODEL_DIR / "onnx" / "wsd_heads.json"
SCODE_MAP_PATH = MODEL_DIR / "onnx" / "wsd_scode_hanja_map.json"
TOKENIZER_NAME = "klue/roberta-base"  # 모델 교체 시 여기만 변경

MAX_LEN = 128

# 전역 모델 상태
session: Optional[ort.InferenceSession] = None
tokenizer = None
heads: dict = {}
scode_map: dict = {}
use_token_type_ids: bool = False  # RoBERTa=False, BERT=True

app = FastAPI(title="한자한자 WSD API")

# CORS — 크롬 확장에서 호출 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


class WSDRequest(BaseModel):
    sentence: str
    words: list[str]


class WSDResponse(BaseModel):
    results: dict[str, Optional[str]]
    elapsed_ms: float


@app.on_event("startup")
async def load_model():
    global session, tokenizer, heads, scode_map, use_token_type_ids

    print("[WSD API] 모델 로딩 시작...")
    t0 = time.time()

    # ONNX 세션
    sess_options = ort.SessionOptions()
    sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sess_options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(ONNX_PATH), sess_options)

    # ONNX 입력 이름으로 token_type_ids 지원 여부 자동 감지
    input_names = [inp.name for inp in session.get_inputs()]
    use_token_type_ids = "token_type_ids" in input_names

    # 토크나이저
    tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_NAME)

    # 분류 헤드 + scode 매핑
    with open(HEADS_PATH) as f:
        heads = json.load(f)
    with open(SCODE_MAP_PATH) as f:
        scode_map = json.load(f)

    elapsed = time.time() - t0
    print(f"[WSD API] 로딩 완료 ({elapsed:.1f}s)")
    print(f"  - 토크나이저: {TOKENIZER_NAME}")
    print(f"  - token_type_ids: {'사용' if use_token_type_ids else '미사용'}")
    print(f"  - 단어 헤드: {len(heads)}개")
    print(f"  - 한자 매핑: {len(scode_map)}개")


def predict_scode(sentence: str, word: str) -> Optional[str]:
    """문맥 기반 scode 예측"""
    if word not in heads:
        return None

    head = heads[word]

    # 토크나이즈
    encoded = tokenizer(
        sentence,
        word,
        max_length=MAX_LEN,
        padding="max_length",
        truncation=True,
        return_tensors="np",
    )

    # ONNX 추론
    feeds = {
        "input_ids": encoded["input_ids"].astype(np.int64),
        "attention_mask": encoded["attention_mask"].astype(np.int64),
    }
    if use_token_type_ids and "token_type_ids" in encoded:
        feeds["token_type_ids"] = encoded["token_type_ids"].astype(np.int64)
    result = session.run(None, feeds)
    cls_output = result[0]  # [1, 768]

    # 분류 헤드
    weight = np.array(head["weight"])  # [num_senses, 768]
    bias = np.array(head["bias"])  # [num_senses]
    logits = cls_output @ weight.T + bias  # [1, num_senses]
    pred_idx = int(np.argmax(logits[0]))

    # label_id → scode 역매핑
    for scode, label_id in head["scodes"].items():
        if label_id == pred_idx:
            return scode
    return None


def predict_hanja(sentence: str, word: str) -> Optional[str]:
    """scode 예측 → 한자 매핑"""
    if word not in scode_map:
        return None

    scode = predict_scode(sentence, word)
    if scode is None:
        return None

    return scode_map[word].get(scode)


@app.post("/wsd", response_model=WSDResponse)
async def wsd_endpoint(req: WSDRequest):
    t0 = time.time()

    results = {}
    for word in req.words:
        if word not in results:  # 중복 제거
            results[word] = predict_hanja(req.sentence, word)

    elapsed_ms = (time.time() - t0) * 1000
    return WSDResponse(results=results, elapsed_ms=round(elapsed_ms, 1))


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "heads": len(heads),
        "scode_map": len(scode_map),
        "model_loaded": session is not None,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8079)
