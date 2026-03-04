#!/usr/bin/env python3
"""
ETRI WiseNLU API로 WSD + NER 자동 라벨링

입력: homonym_sentences.jsonl (extract_homonym_sentences.py 출력)
출력: labeled_data.jsonl (WSD scode + NER 태그 포함)

ETRI API 제한: 5,000건/일, 1만 글자/회
→ 문장을 배치로 묶어서 1회 호출당 최대한 많은 문장 처리

Usage:
    python label_with_etri.py \
        --input /home/jinwoo/wsd-data/homonym_sentences.jsonl \
        --output /home/jinwoo/wsd-data/labeled_data.jsonl \
        --api-key ed2ac54e-cf09-4089-a5bf-e2dc08120435 \
        --daily-limit 5000 \
        --resume
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, date
from pathlib import Path
import urllib.request
import urllib.error

ETRI_URL = "http://epretx.etri.re.kr:8000/api/WiseNLU"
ANALYSIS_CODE = "ner"  # ner 코드로 WSD + NER 동시 획득
MAX_CHARS_PER_CALL = 3000  # 한글 UTF-8 3바이트 고려, 안전하게
RATE_LIMIT_SLEEP = 0.3  # 초 (API 부하 방지)


def call_etri_api(text: str, api_key: str) -> dict | None:
    """ETRI WiseNLU API 호출"""
    payload = json.dumps({
        "argument": {
            "analysis_code": ANALYSIS_CODE,
            "text": text,
        }
    }).encode("utf-8")

    req = urllib.request.Request(
        ETRI_URL,
        data=payload,
        headers={
            "Content-Type": "application/json; charset=UTF-8",
            "Authorization": api_key,
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("result") == 0:
                return result.get("return_object", {})
            else:
                print(f"  [API ERROR] result={result.get('result')}: {result.get('reason', 'unknown')}")
                return None
    except urllib.error.HTTPError as e:
        print(f"  [HTTP ERROR] {e.code}: {e.reason}")
        if e.code == 429:  # Rate limit
            print("  일일 한도 도달. 내일 --resume으로 재시작하세요.")
            return "RATE_LIMITED"
        return None
    except Exception as e:
        print(f"  [ERROR] {e}")
        return None


def extract_wsd_labels(api_result: dict) -> list[dict]:
    """API 결과에서 WSD 라벨 추출"""
    wsd_labels = []
    for sentence in api_result.get("sentence", []):
        sent_text = sentence.get("text", "")
        for morp in sentence.get("WSD", []):
            # scode가 있으면 동음이의어 판별 결과
            if morp.get("scode") and morp.get("scode") != "0":
                wsd_labels.append({
                    "word": morp.get("text", ""),
                    "scode": morp.get("scode", ""),
                    "type": morp.get("type", ""),
                    "begin": morp.get("begin", 0),
                    "end": morp.get("end", 0),
                    "sentence": sent_text,
                })
    return wsd_labels


def extract_ner_labels(api_result: dict) -> list[dict]:
    """API 결과에서 NER 라벨 추출"""
    ner_labels = []
    for sentence in api_result.get("sentence", []):
        sent_text = sentence.get("text", "")
        for ne in sentence.get("NE", []):
            ner_labels.append({
                "word": ne.get("text", ""),
                "type": ne.get("type", ""),  # PS_NAME, CV_POSITION 등
                "begin": ne.get("begin", 0),
                "end": ne.get("end", 0),
                "sentence": sent_text,
            })
    return ner_labels


def batch_sentences(sentences: list[dict], max_chars: int) -> list[list[dict]]:
    """문장들을 API 호출 단위 배치로 묶기"""
    batches = []
    current_batch = []
    current_chars = 0

    for item in sentences:
        sent_len = len(item["sentence"])
        if current_chars + sent_len + 1 > max_chars and current_batch:
            batches.append(current_batch)
            current_batch = []
            current_chars = 0
        current_batch.append(item)
        current_chars += sent_len + 1  # +1 for newline separator

    if current_batch:
        batches.append(current_batch)

    return batches


def load_progress(progress_file: str) -> int:
    """진행 상황 파일에서 처리된 배치 수 로드"""
    if os.path.exists(progress_file):
        with open(progress_file, "r") as f:
            data = json.load(f)
            return data.get("completed_batches", 0)
    return 0


def save_progress(progress_file: str, completed: int, total: int, api_calls: int):
    """진행 상황 저장"""
    with open(progress_file, "w") as f:
        json.dump({
            "completed_batches": completed,
            "total_batches": total,
            "api_calls_today": api_calls,
            "last_updated": datetime.now().isoformat(),
            "date": date.today().isoformat(),
        }, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="ETRI API WSD+NER 라벨링")
    parser.add_argument("--input", required=True, help="homonym_sentences.jsonl 경로")
    parser.add_argument("--output", required=True, help="labeled_data.jsonl 출력 경로")
    parser.add_argument("--api-key", required=True, help="ETRI API 키")
    parser.add_argument("--daily-limit", type=int, default=4500, help="일일 API 호출 한도 (안전 마진)")
    parser.add_argument("--resume", action="store_true", help="이전 진행 상황에서 이어서 실행")
    args = parser.parse_args()

    # 입력 로드
    print(f"입력 파일: {args.input}")
    sentences = []
    with open(args.input, "r", encoding="utf-8") as f:
        for line in f:
            sentences.append(json.loads(line.strip()))
    print(f"총 문장 수: {len(sentences)}")

    # 배치 구성
    batches = batch_sentences(sentences, MAX_CHARS_PER_CALL)
    print(f"배치 수: {len(batches)} (배치당 ~{MAX_CHARS_PER_CALL}자)")

    # 진행 상황 확인
    progress_file = args.output + ".progress.json"
    start_batch = 0
    if args.resume:
        start_batch = load_progress(progress_file)
        if start_batch > 0:
            print(f"이전 진행: {start_batch}/{len(batches)} 배치 완료, 이어서 시작")

    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    # 출력 파일 (append 모드)
    mode = "a" if args.resume and start_batch > 0 else "w"
    api_calls = 0
    total_wsd = 0
    total_ner = 0

    with open(args.output, mode, encoding="utf-8") as out:
        for batch_idx in range(start_batch, len(batches)):
            if api_calls >= args.daily_limit:
                print(f"\n일일 한도 도달 ({api_calls}건). 내일 --resume으로 재시작하세요.")
                save_progress(progress_file, batch_idx, len(batches), api_calls)
                return

            batch = batches[batch_idx]
            # 배치 내 문장들을 줄바꿈으로 합쳐서 한 번에 보내기
            combined_text = "\n".join(item["sentence"] for item in batch)

            result = call_etri_api(combined_text, args.api_key)

            if result == "RATE_LIMITED":
                save_progress(progress_file, batch_idx, len(batches), api_calls)
                return

            if result is None:
                print(f"  배치 {batch_idx} 실패, 건너뜀")
                time.sleep(1)
                continue

            api_calls += 1

            # WSD + NER 라벨 추출
            wsd_labels = extract_wsd_labels(result)
            ner_labels = extract_ner_labels(result)
            total_wsd += len(wsd_labels)
            total_ner += len(ner_labels)

            # 결과 저장
            out.write(json.dumps({
                "batch_idx": batch_idx,
                "sentences": [item["sentence"] for item in batch],
                "wsd": wsd_labels,
                "ner": ner_labels,
            }, ensure_ascii=False) + "\n")

            if (batch_idx + 1) % 50 == 0:
                print(f"  [{batch_idx+1}/{len(batches)}] API {api_calls}건, WSD {total_wsd}개, NER {total_ner}개", flush=True)
                save_progress(progress_file, batch_idx + 1, len(batches), api_calls)

            time.sleep(RATE_LIMIT_SLEEP)

    save_progress(progress_file, len(batches), len(batches), api_calls)
    print(f"\n완료! API {api_calls}건 호출, WSD {total_wsd}개, NER {total_ner}개 라벨")
    print(f"출력: {args.output}")


if __name__ == "__main__":
    main()
