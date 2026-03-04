#!/usr/bin/env python3
"""
WSD 학습 데이터셋 구축

ETRI labeled_data.jsonl → HuggingFace Dataset (train/val/test)

학습 형식 (문장 분류):
  입력: [CLS] 문장 [SEP] 타겟단어 [SEP]
  출력: scode (의미 번호)

각 동음이의어 단어에 대해:
  - 최소 2개 이상 다른 scode를 가진 단어만 포함
  - 각 scode별 최소 N개 이상 샘플
  - train:val:test = 8:1:1

Usage:
    python build_dataset.py \
        --labeled /home/jinwoo/wsd-data/labeled_data.jsonl \
        --homonym-csv /home/jinwoo/wsd-data/hanja-words-extracted.csv \
        --output-dir /home/jinwoo/wsd-data/dataset \
        --min-senses 2 \
        --min-samples-per-sense 3
"""

import argparse
import csv
import json
import os
import random
from collections import defaultdict
from pathlib import Path


def load_homonyms(csv_path: str) -> set[str]:
    """동음이의어 목록 로드 (2개+ 한자 매핑, 2글자 이상)"""
    word_count: dict[str, int] = defaultdict(int)
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            word_count[row["korean"]] += 1
    return {w for w, c in word_count.items() if c >= 2 and len(w) >= 2}


def collect_wsd_samples(
    labeled_path: str,
    homonyms: set[str],
) -> dict[str, list[dict]]:
    """ETRI 라벨 데이터에서 동음이의어별 WSD 샘플 수집"""
    # word -> list of {sentence, scode, word, begin, end}
    samples: dict[str, list[dict]] = defaultdict(list)

    with open(labeled_path, "r", encoding="utf-8") as f:
        for line in f:
            batch = json.loads(line)
            for wsd in batch["wsd"]:
                word = wsd["word"]
                if word not in homonyms:
                    continue
                samples[word].append({
                    "sentence": wsd["sentence"],
                    "word": word,
                    "scode": wsd["scode"],
                })

    return dict(samples)


def filter_ambiguous(
    samples: dict[str, list[dict]],
    min_senses: int,
    min_samples_per_sense: int,
) -> dict[str, list[dict]]:
    """실제로 다의어인 단어만 필터"""
    filtered = {}
    for word, word_samples in samples.items():
        # scode별 그룹핑
        by_scode: dict[str, list[dict]] = defaultdict(list)
        for s in word_samples:
            by_scode[s["scode"]].append(s)

        # 최소 N개 sense, 각 sense별 최소 M개 샘플
        valid_scodes = {
            sc: ss for sc, ss in by_scode.items()
            if len(ss) >= min_samples_per_sense
        }
        if len(valid_scodes) >= min_senses:
            # 유효한 scode의 샘플만 보존
            valid_samples = []
            for ss in valid_scodes.values():
                valid_samples.extend(ss)
            filtered[word] = valid_samples

    return filtered


def build_label_map(samples: dict[str, list[dict]]) -> dict[str, dict[str, int]]:
    """단어별 scode → label_id 매핑 생성"""
    label_map = {}
    for word, word_samples in samples.items():
        scodes = sorted({s["scode"] for s in word_samples})
        label_map[word] = {sc: i for i, sc in enumerate(scodes)}
    return label_map


def split_dataset(
    samples: dict[str, list[dict]],
    label_map: dict[str, dict[str, int]],
    seed: int = 42,
) -> tuple[list[dict], list[dict], list[dict]]:
    """단어별 stratified split (8:1:1)"""
    random.seed(seed)
    train, val, test = [], [], []

    for word, word_samples in samples.items():
        # scode별로 분리해서 각각 split
        by_scode: dict[str, list[dict]] = defaultdict(list)
        for s in word_samples:
            by_scode[s["scode"]].append(s)

        for scode, ss in by_scode.items():
            random.shuffle(ss)
            n = len(ss)
            n_val = max(1, n // 10)
            n_test = max(1, n // 10)
            n_train = n - n_val - n_test

            if n_train < 1:
                # 샘플이 너무 적으면 전부 train
                for s in ss:
                    s["label"] = label_map[word][scode]
                    s["num_senses"] = len(label_map[word])
                train.extend(ss)
                continue

            for s in ss[:n_train]:
                s["label"] = label_map[word][scode]
                s["num_senses"] = len(label_map[word])
                train.append(s)
            for s in ss[n_train:n_train + n_val]:
                s["label"] = label_map[word][scode]
                s["num_senses"] = len(label_map[word])
                val.append(s)
            for s in ss[n_train + n_val:]:
                s["label"] = label_map[word][scode]
                s["num_senses"] = len(label_map[word])
                test.append(s)

    random.shuffle(train)
    random.shuffle(val)
    random.shuffle(test)
    return train, val, test


def save_jsonl(data: list[dict], path: str):
    with open(path, "w", encoding="utf-8") as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description="WSD 학습 데이터셋 구축")
    parser.add_argument("--labeled", required=True, help="labeled_data.jsonl 경로")
    parser.add_argument("--homonym-csv", required=True, help="hanja-words-extracted.csv 경로")
    parser.add_argument("--output-dir", required=True, help="출력 디렉토리")
    parser.add_argument("--min-senses", type=int, default=2, help="최소 의미 수")
    parser.add_argument("--min-samples-per-sense", type=int, default=5, help="의미당 최소 샘플 수")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    # 1. 동음이의어 목록 로드
    print("동음이의어 목록 로드...")
    homonyms = load_homonyms(args.homonym_csv)
    print(f"  동음이의어: {len(homonyms)}개")

    # 2. WSD 샘플 수집
    print("WSD 샘플 수집...")
    samples = collect_wsd_samples(args.labeled, homonyms)
    total = sum(len(v) for v in samples.values())
    print(f"  매칭 단어: {len(samples)}개, 총 샘플: {total}개")

    # 3. 다의어 필터링
    print(f"다의어 필터링 (min_senses={args.min_senses}, min_per_sense={args.min_samples_per_sense})...")
    filtered = filter_ambiguous(samples, args.min_senses, args.min_samples_per_sense)
    total_filtered = sum(len(v) for v in filtered.values())
    print(f"  유효 단어: {len(filtered)}개, 유효 샘플: {total_filtered}개")

    if not filtered:
        print("유효한 다의어가 없습니다! min-samples-per-sense를 줄여보세요.")
        return

    # 4. 라벨 맵 생성
    label_map = build_label_map(filtered)
    max_senses = max(len(v) for v in label_map.values())
    print(f"  최대 의미 수: {max_senses}")

    # 5. 데이터 분할
    print("Train/Val/Test 분할 (8:1:1)...")
    train, val, test = split_dataset(filtered, label_map, args.seed)
    print(f"  Train: {len(train)} / Val: {len(val)} / Test: {len(test)}")

    # 6. 저장
    os.makedirs(args.output_dir, exist_ok=True)
    save_jsonl(train, os.path.join(args.output_dir, "train.jsonl"))
    save_jsonl(val, os.path.join(args.output_dir, "val.jsonl"))
    save_jsonl(test, os.path.join(args.output_dir, "test.jsonl"))

    # 라벨 맵 저장 (추론 시 필요)
    with open(os.path.join(args.output_dir, "label_map.json"), "w", encoding="utf-8") as f:
        json.dump(label_map, f, ensure_ascii=False, indent=2)

    # 통계 저장
    stats = {
        "total_words": len(filtered),
        "max_senses": max_senses,
        "train_size": len(train),
        "val_size": len(val),
        "test_size": len(test),
        "top_words": [
            {"word": w, "senses": len(label_map[w]), "samples": len(filtered[w])}
            for w in sorted(filtered.keys(), key=lambda w: -len(filtered[w]))[:30]
        ],
    }
    with open(os.path.join(args.output_dir, "stats.json"), "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    print(f"\n저장 완료: {args.output_dir}")
    print(f"  train.jsonl / val.jsonl / test.jsonl / label_map.json / stats.json")


if __name__ == "__main__":
    main()
