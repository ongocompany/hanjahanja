#!/usr/bin/env python3
"""
학습된 WSD 모델 → ONNX 변환 + INT8 양자화

출력:
  - wsd_encoder.onnx  (KcBERT 인코더, ~100MB → INT8 ~25MB)
  - wsd_heads.json    (단어별 분류 헤드 가중치, ~1MB)

크롬 확장에서 ONNX Runtime Web으로 로드:
  1. onnx encoder로 [CLS] 벡터 추출
  2. JS에서 wsd_heads.json의 해당 단어 헤드로 분류

Usage:
    python export_onnx.py \
        --checkpoint /home/jinwoo/wsd-data/model/best_model.pt \
        --output-dir /home/jinwoo/wsd-data/onnx
"""

import argparse
import json
import os

import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel

from train_wsd import WSDModel


def export_encoder_onnx(model: WSDModel, tokenizer, output_path: str, max_len: int = 128):
    """KcBERT 인코더를 ONNX로 변환"""
    model.eval()
    device = next(model.parameters()).device

    # 더미 입력
    dummy = tokenizer(
        "테스트 문장입니다.",
        "테스트",
        max_length=max_len,
        padding="max_length",
        truncation=True,
        return_tensors="pt",
    )
    dummy_input = {
        "input_ids": dummy["input_ids"].to(device),
        "attention_mask": dummy["attention_mask"].to(device),
        "token_type_ids": dummy.get("token_type_ids", torch.zeros(1, max_len, dtype=torch.long)).to(device),
    }

    # 인코더만 추출하는 래퍼
    class EncoderWrapper(torch.nn.Module):
        def __init__(self, encoder):
            super().__init__()
            self.encoder = encoder

        def forward(self, input_ids, attention_mask, token_type_ids):
            outputs = self.encoder(
                input_ids=input_ids,
                attention_mask=attention_mask,
                token_type_ids=token_type_ids,
            )
            return outputs.last_hidden_state[:, 0, :]  # [CLS] 벡터만

    wrapper = EncoderWrapper(model.encoder).to(device)
    wrapper.eval()

    torch.onnx.export(
        wrapper,
        (dummy_input["input_ids"], dummy_input["attention_mask"], dummy_input["token_type_ids"]),
        output_path,
        input_names=["input_ids", "attention_mask", "token_type_ids"],
        output_names=["cls_output"],
        dynamic_axes={
            "input_ids": {0: "batch"},
            "attention_mask": {0: "batch"},
            "token_type_ids": {0: "batch"},
            "cls_output": {0: "batch"},
        },
        opset_version=14,
        do_constant_folding=True,
    )
    print(f"  ONNX 인코더 저장: {output_path} ({os.path.getsize(output_path) / 1e6:.1f}MB)")


def quantize_onnx(input_path: str, output_path: str):
    """ONNX 모델 INT8 양자화"""
    try:
        from onnxruntime.quantization import quantize_dynamic, QuantType
        quantize_dynamic(
            input_path,
            output_path,
            weight_type=QuantType.QInt8,
        )
        print(f"  양자화 완료: {output_path} ({os.path.getsize(output_path) / 1e6:.1f}MB)")
    except ImportError:
        print("  [SKIP] onnxruntime-tools 미설치, 양자화 건너뜀")


def export_heads_json(model: WSDModel, label_map: dict, output_path: str):
    """분류 헤드 가중치를 JSON으로 저장 (JS에서 행렬곱용)"""
    heads_data = {}
    for word, scodes in label_map.items():
        key = model._word_key(word)
        if key in model.heads:
            head = model.heads[key]
            heads_data[word] = {
                "scodes": scodes,  # scode → label_id
                "weight": head.weight.detach().cpu().numpy().tolist(),
                "bias": head.bias.detach().cpu().numpy().tolist(),
            }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(heads_data, f, ensure_ascii=False)

    print(f"  헤드 가중치 저장: {output_path} ({os.path.getsize(output_path) / 1e6:.1f}MB)")
    print(f"  단어 수: {len(heads_data)}")


def main():
    parser = argparse.ArgumentParser(description="WSD 모델 ONNX 변환")
    parser.add_argument("--checkpoint", required=True, help="best_model.pt 경로")
    parser.add_argument("--output-dir", required=True, help="ONNX 출력 디렉토리")
    args = parser.parse_args()

    # 체크포인트 로드
    print(f"체크포인트 로드: {args.checkpoint}")
    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    label_map = checkpoint["label_map"]
    model_name = checkpoint["model_name"]
    max_len = checkpoint.get("max_len", 128)

    print(f"  모델: {model_name}")
    print(f"  단어 수: {len(label_map)}")
    print(f"  Val accuracy: {checkpoint.get('val_acc', 'N/A')}")

    # 모델 재구성
    model = WSDModel(model_name, label_map)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    tokenizer = AutoTokenizer.from_pretrained(model_name)

    os.makedirs(args.output_dir, exist_ok=True)

    # 1. ONNX 인코더 변환
    onnx_path = os.path.join(args.output_dir, "wsd_encoder.onnx")
    print("\n1. ONNX 인코더 변환...")
    export_encoder_onnx(model, tokenizer, onnx_path, max_len)

    # 2. INT8 양자화
    quant_path = os.path.join(args.output_dir, "wsd_encoder_int8.onnx")
    print("\n2. INT8 양자화...")
    quantize_onnx(onnx_path, quant_path)

    # 3. 헤드 가중치 JSON
    heads_path = os.path.join(args.output_dir, "wsd_heads.json")
    print("\n3. 분류 헤드 JSON 저장...")
    export_heads_json(model, label_map, heads_path)

    # 4. 토크나이저 저장
    tok_dir = os.path.join(args.output_dir, "tokenizer")
    tokenizer.save_pretrained(tok_dir)
    print(f"\n4. 토크나이저 저장: {tok_dir}")

    print(f"\n완료! 출력: {args.output_dir}")


if __name__ == "__main__":
    main()
