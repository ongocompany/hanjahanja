#!/usr/bin/env python3
"""
코퍼스에서 동음이의어 포함 문장 추출

입력: AI Hub 한국어 말뭉치 JSON (extracted/ 폴더)
출력: homonym_sentences.jsonl (문장 + 포함된 동음이의어 목록)

Usage:
    python extract_homonym_sentences.py \
        --corpus-dir /home/jinwoo/corpus/extracted \
        --homonym-csv /home/jinwoo/hanjahanja/scripts/data/hanja-words-extracted.csv \
        --output /home/jinwoo/wsd-data/homonym_sentences.jsonl \
        --max-sentences 500000
"""

import argparse
import csv
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

import ahocorasick_rs


def load_homonyms(csv_path: str) -> tuple[list[str], "ahocorasick_rs.AhoCorasick"]:
    """동음이의어 목록 로드 + Aho-Corasick 오토마톤 구축"""
    word_count: dict[str, int] = defaultdict(int)
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            word_count[row["korean"]] += 1

    # 2개 이상 한자가 매핑되는 단어만 = 동음이의어
    homonyms = sorted({word for word, count in word_count.items() if count >= 2 and len(word) >= 2})
    print(f"동음이의어 로드: {len(homonyms)}개 (2글자 이상, 매핑 2개+)")

    # Aho-Corasick 오토마톤 구축 (한 번만, O(n) 매칭)
    print("Aho-Corasick 오토마톤 구축 중...")
    ac = ahocorasick_rs.AhoCorasick(homonyms)
    print("오토마톤 구축 완료!")
    return homonyms, ac


def split_sentences(text: str) -> list[str]:
    """텍스트를 문장 단위로 분리"""
    sentences = re.split(r'(?<=[.!?。])\s+', text.strip())
    result = []
    for s in sentences:
        result.extend(s.split('\n'))
    return [s.strip() for s in result if len(s.strip()) >= 10]


def find_homonyms_in_sentence(sentence: str, homonym_list: list[str], ac: "ahocorasick_rs.AhoCorasick") -> list[str]:
    """문장에서 동음이의어 찾기 (Aho-Corasick, O(n))"""
    matches = ac.find_matches_as_indexes(sentence)
    found = list({homonym_list[idx] for idx, _, _ in matches})
    return found


def process_json_file(json_path: str, homonym_list: list[str], ac: "ahocorasick_rs.AhoCorasick") -> list[dict]:
    """JSON 파일에서 동음이의어 포함 문장 추출"""
    results = []
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        print(f"  [SKIP] {json_path}: {e}")
        return results

    # data_info 배열에서 contents 추출
    data_info = data.get("data_info", [])
    if not isinstance(data_info, list):
        return results

    for item in data_info:
        contents = item.get("contents", "")
        if not contents or not isinstance(contents, str):
            continue

        sentences = split_sentences(contents)
        for sentence in sentences:
            if len(sentence) > 500:
                continue

            found = find_homonyms_in_sentence(sentence, homonym_list, ac)
            if found:
                results.append({
                    "sentence": sentence,
                    "homonyms": found,
                    "source": os.path.basename(json_path),
                })

    return results


def main():
    parser = argparse.ArgumentParser(description="코퍼스에서 동음이의어 포함 문장 추출")
    parser.add_argument("--corpus-dir", required=True, help="코퍼스 JSON 폴더")
    parser.add_argument("--homonym-csv", required=True, help="hanja-words-extracted.csv 경로")
    parser.add_argument("--output", required=True, help="출력 JSONL 파일 경로")
    parser.add_argument("--max-sentences", type=int, default=500000, help="최대 추출 문장 수")
    args = parser.parse_args()

    # 동음이의어 목록 + Aho-Corasick 오토마톤 로드
    homonym_list, ac = load_homonyms(args.homonym_csv)
    print(f"코퍼스 디렉토리: {args.corpus_dir}")

    # JSON 파일 찾기
    json_files = sorted(Path(args.corpus_dir).rglob("*.json"))
    print(f"JSON 파일 수: {len(json_files)}")

    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    total = 0
    with open(args.output, "w", encoding="utf-8") as out:
        for i, json_file in enumerate(json_files):
            results = process_json_file(str(json_file), homonym_list, ac)
            for r in results:
                out.write(json.dumps(r, ensure_ascii=False) + "\n")
                total += 1
                if total >= args.max_sentences:
                    print(f"\n최대 문장 수 도달: {total}")
                    print(f"출력: {args.output}")
                    return

            if (i + 1) % 10 == 0:
                print(f"  [{i+1}/{len(json_files)}] 파일 처리 완료, 누적 {total}개 문장", flush=True)

    print(f"\n완료! 총 {total}개 문장 추출")
    print(f"출력: {args.output}")


if __name__ == "__main__":
    main()
