#!/usr/bin/env python3
"""
한국어 BERT 기반 WSD (동음이의어 판별) 파인튜닝

지원 모델:
  - beomi/kcbert-base (한국어 BERT, token_type_ids 사용)
  - klue/roberta-base (KLUE RoBERTa, token_type_ids 미사용)
  - klue/roberta-large (KLUE RoBERTa Large)

태스크: 문장 + 타겟단어 → scode 분류
입력 형식: [CLS] 문장 [SEP] 타겟단어 [SEP]
출력: 단어별 scode 분류 (per-word head)

구조:
  - 인코더 (shared) + 단어별 분류 헤드 (각 단어마다 별도 Linear)
  → 학습 시 해당 단어의 헤드만 업데이트

RTX 3080 (10GB VRAM) 기준:
  - kcbert-base: batch=32 → ~4GB VRAM
  - klue/roberta-base: batch=32 → ~4GB VRAM
  - klue/roberta-large: batch=8~16 → ~8-9GB VRAM

Usage:
    python train_wsd.py \
        --dataset-dir /home/jinwoo/wsd-data/dataset \
        --output-dir /home/jinwoo/wsd-data/model \
        --model-name klue/roberta-base \
        --epochs 5 \
        --batch-size 32 \
        --lr 2e-5
"""

import argparse
import hashlib
import json
import os
import sys
from collections import defaultdict

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoConfig,
    AutoTokenizer,
    AutoModel,
    get_linear_schedule_with_warmup,
)


def model_uses_token_type_ids(model_name: str) -> bool:
    """모델이 token_type_ids를 사용하는지 확인 (BERT=True, RoBERTa=False)"""
    config = AutoConfig.from_pretrained(model_name)
    return getattr(config, "type_vocab_size", 0) > 1


# === 데이터셋 ===

class WSDDataset(Dataset):
    """WSD 학습용 데이터셋"""

    def __init__(self, jsonl_path: str, tokenizer, label_map: dict, max_len: int = 128, use_token_type_ids: bool = True):
        self.tokenizer = tokenizer
        self.label_map = label_map
        self.max_len = max_len
        self.use_token_type_ids = use_token_type_ids
        self.samples = []

        with open(jsonl_path, "r", encoding="utf-8") as f:
            for line in f:
                item = json.loads(line)
                self.samples.append(item)

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        item = self.samples[idx]
        sentence = item["sentence"]
        word = item["word"]
        label = item["label"]

        # [CLS] 문장 [SEP] 타겟단어 [SEP]
        encoding = self.tokenizer(
            sentence,
            word,
            max_length=self.max_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )

        result = {
            "input_ids": encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
            "word": word,
            "label": torch.tensor(label, dtype=torch.long),
        }

        # BERT: token_type_ids 사용, RoBERTa: 미사용
        if self.use_token_type_ids:
            result["token_type_ids"] = encoding.get(
                "token_type_ids",
                torch.zeros(self.max_len, dtype=torch.long)
            ).squeeze(0)

        return result


# === 모델 ===

class WSDModel(nn.Module):
    """
    단어별 분류 헤드를 가진 WSD 모델

    - KcBERT [CLS] 벡터를 공유 인코더로 사용
    - 각 동음이의어마다 개별 Linear 헤드 (num_senses 출력)
    - 학습 시 해당 단어의 헤드만 forward/backward
    """

    def __init__(self, model_name: str, label_map: dict, dropout: float = 0.1):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(model_name)
        hidden_size = self.encoder.config.hidden_size
        self.dropout = nn.Dropout(dropout)

        # 단어별 분류 헤드
        self.heads = nn.ModuleDict()
        for word, scodes in label_map.items():
            num_classes = len(scodes)
            # ModuleDict 키에 특수문자 불가 → 해시
            key = self._word_key(word)
            self.heads[key] = nn.Linear(hidden_size, num_classes)

        self.word_to_key = {w: self._word_key(w) for w in label_map}

    @staticmethod
    def _word_key(word: str) -> str:
        """단어를 ModuleDict 키로 변환 (결정적 해시, 영숫자만 허용)"""
        h = hashlib.md5(word.encode("utf-8")).hexdigest()[:8]
        return f"w_{h}"

    def forward(self, input_ids, attention_mask, words, token_type_ids=None):
        """
        words: list[str] — 배치 내 각 샘플의 타겟 단어
        token_type_ids: BERT 계열만 사용, RoBERTa는 None
        반환: (logits_list, indices_per_head)
        """
        kwargs = {"input_ids": input_ids, "attention_mask": attention_mask}
        if token_type_ids is not None:
            kwargs["token_type_ids"] = token_type_ids
        outputs = self.encoder(**kwargs)
        cls_output = self.dropout(outputs.last_hidden_state[:, 0, :])  # [CLS]

        # 단어별로 그룹핑하여 각 헤드에 통과
        word_groups: dict[str, list[int]] = defaultdict(list)
        for i, w in enumerate(words):
            key = self.word_to_key.get(w)
            if key and key in self.heads:
                word_groups[key].append(i)

        all_logits = torch.zeros(len(words), 1, device=input_ids.device)
        logits_list = []

        for key, indices in word_groups.items():
            idx_tensor = torch.tensor(indices, device=input_ids.device)
            head_input = cls_output[idx_tensor]
            head_logits = self.heads[key](head_input)
            logits_list.append((key, indices, head_logits))

        return logits_list


# === 학습 ===

def train_epoch(model, dataloader, optimizer, scheduler, device):
    model.train()
    total_loss = 0
    total_correct = 0
    total_samples = 0

    for batch in dataloader:
        input_ids = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        token_type_ids = batch.get("token_type_ids")
        if token_type_ids is not None:
            token_type_ids = token_type_ids.to(device)
        labels = batch["label"].to(device)
        words = batch["word"]

        logits_list = model(input_ids, attention_mask, words, token_type_ids)

        # 단어별 헤드의 loss 합산
        loss = torch.tensor(0.0, device=device, requires_grad=True)
        batch_correct = 0
        batch_total = 0

        for key, indices, head_logits in logits_list:
            idx_tensor = torch.tensor(indices, device=device)
            head_labels = labels[idx_tensor]
            head_loss = nn.functional.cross_entropy(head_logits, head_labels)
            loss = loss + head_loss

            preds = head_logits.argmax(dim=-1)
            batch_correct += (preds == head_labels).sum().item()
            batch_total += len(indices)

        if batch_total > 0:
            loss = loss / len(logits_list)  # 평균 loss
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()

            total_loss += loss.item() * batch_total
            total_correct += batch_correct
            total_samples += batch_total

    avg_loss = total_loss / max(total_samples, 1)
    accuracy = total_correct / max(total_samples, 1)
    return avg_loss, accuracy


@torch.no_grad()
def evaluate(model, dataloader, device):
    model.eval()
    total_correct = 0
    total_samples = 0

    for batch in dataloader:
        input_ids = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        token_type_ids = batch.get("token_type_ids")
        if token_type_ids is not None:
            token_type_ids = token_type_ids.to(device)
        labels = batch["label"].to(device)
        words = batch["word"]

        logits_list = model(input_ids, attention_mask, words, token_type_ids)

        for key, indices, head_logits in logits_list:
            idx_tensor = torch.tensor(indices, device=device)
            head_labels = labels[idx_tensor]
            preds = head_logits.argmax(dim=-1)
            total_correct += (preds == head_labels).sum().item()
            total_samples += len(indices)

    accuracy = total_correct / max(total_samples, 1)
    return accuracy


def main():
    parser = argparse.ArgumentParser(description="KcBERT WSD 파인튜닝")
    parser.add_argument("--dataset-dir", required=True, help="데이터셋 디렉토리")
    parser.add_argument("--output-dir", required=True, help="모델 출력 디렉토리")
    parser.add_argument("--model-name", default="klue/roberta-base", help="사전학습 모델 (klue/roberta-base, klue/roberta-large, beomi/kcbert-base)")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--max-len", type=int, default=128)
    parser.add_argument("--warmup-ratio", type=float, default=0.1)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    if device.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}GB")

    # 라벨 맵 로드
    with open(os.path.join(args.dataset_dir, "label_map.json"), "r") as f:
        label_map = json.load(f)
    print(f"단어 수: {len(label_map)}, 최대 의미 수: {max(len(v) for v in label_map.values())}")

    # 토크나이저 + token_type_ids 지원 여부
    use_tti = model_uses_token_type_ids(args.model_name)
    print(f"토크나이저 로드: {args.model_name} (token_type_ids={'사용' if use_tti else '미사용'})")
    tokenizer = AutoTokenizer.from_pretrained(args.model_name)

    # 데이터셋
    print("데이터셋 로드...")
    train_ds = WSDDataset(os.path.join(args.dataset_dir, "train.jsonl"), tokenizer, label_map, args.max_len, use_tti)
    val_ds = WSDDataset(os.path.join(args.dataset_dir, "val.jsonl"), tokenizer, label_map, args.max_len, use_tti)
    test_ds = WSDDataset(os.path.join(args.dataset_dir, "test.jsonl"), tokenizer, label_map, args.max_len, use_tti)
    print(f"  Train: {len(train_ds)} / Val: {len(val_ds)} / Test: {len(test_ds)}")

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=2)
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False, num_workers=2)

    # 모델
    print(f"모델 초기화: {args.model_name} + {len(label_map)} word heads")
    model = WSDModel(args.model_name, label_map).to(device)

    # 옵티마이저
    total_steps = len(train_loader) * args.epochs
    warmup_steps = int(total_steps * args.warmup_ratio)

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    scheduler = get_linear_schedule_with_warmup(optimizer, warmup_steps, total_steps)

    # 학습
    print(f"\n학습 시작: {args.epochs} epochs, batch={args.batch_size}, lr={args.lr}")
    print(f"  Total steps: {total_steps}, Warmup: {warmup_steps}")
    best_val_acc = 0

    os.makedirs(args.output_dir, exist_ok=True)

    for epoch in range(args.epochs):
        train_loss, train_acc = train_epoch(model, train_loader, optimizer, scheduler, device)
        val_acc = evaluate(model, val_loader, device)

        print(f"  Epoch {epoch+1}/{args.epochs}: loss={train_loss:.4f} train_acc={train_acc:.4f} val_acc={val_acc:.4f}", flush=True)

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save({
                "model_state_dict": model.state_dict(),
                "label_map": label_map,
                "model_name": args.model_name,
                "max_len": args.max_len,
                "val_acc": val_acc,
                "epoch": epoch + 1,
            }, os.path.join(args.output_dir, "best_model.pt"))
            print(f"    → Best model 저장 (val_acc={val_acc:.4f})")

    # 테스트 평가
    print(f"\n최종 테스트 평가 (best model)...")
    checkpoint = torch.load(os.path.join(args.output_dir, "best_model.pt"), weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    test_acc = evaluate(model, test_loader, device)
    print(f"  Test accuracy: {test_acc:.4f}")

    # 결과 저장
    results = {
        "model_name": args.model_name,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "lr": args.lr,
        "best_val_acc": best_val_acc,
        "test_acc": test_acc,
        "num_words": len(label_map),
        "train_size": len(train_ds),
        "val_size": len(val_ds),
        "test_size": len(test_ds),
    }
    with open(os.path.join(args.output_dir, "results.json"), "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n완료! 모델: {args.output_dir}/best_model.pt")


if __name__ == "__main__":
    main()
