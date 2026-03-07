#!/usr/bin/env python3
"""
국회 속기록 데이터 → WSD 학습 데이터 변환

입력: scripts/history-hanja-pairs.json (crawl-history-db.ts 출력)
참조: apps/extension/public/wsd/wsd_scode_hanja_map.json (한자→scode 역매핑)

출력: scripts/wsd/history_wsd_samples.jsonl
형식: {"sentence": "...", "word": "의원", "scode": "06", "label": 0}

기존 ETRI 라벨 데이터와 동일한 형식으로 변환하여
build_dataset.py에서 합쳐서 학습 가능.

Usage:
    python convert_history_to_wsd.py
"""

import json
import os
from collections import defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent

HISTORY_PAIRS_PATH = SCRIPT_DIR.parent / "history-hanja-pairs.json"
SCODE_MAP_PATH = PROJECT_ROOT / "apps" / "extension" / "public" / "wsd" / "wsd_scode_hanja_map.json"
OUTPUT_PATH = SCRIPT_DIR / "history_wsd_samples.jsonl"


def build_reverse_map(scode_map: dict) -> dict[str, dict[str, str]]:
    """
    (word, hanja) → scode 역매핑 생성
    scode_map: { word: { scode: hanja } }
    반환: { word: { hanja: scode } }
    """
    reverse = {}
    for word, scodes in scode_map.items():
        hanja_to_scode: dict[str, str] = {}
        for scode, hanja in scodes.items():
            # 같은 한자에 여러 scode가 있을 수 있음 → 첫 번째 사용
            if hanja not in hanja_to_scode:
                hanja_to_scode[hanja] = scode
        if hanja_to_scode:
            reverse[word] = hanja_to_scode
    return reverse


def main():
    # 1. scode 맵 로드
    print("scode 맵 로드...")
    with open(SCODE_MAP_PATH, "r", encoding="utf-8") as f:
        scode_map = json.load(f)
    reverse_map = build_reverse_map(scode_map)
    print(f"  역매핑: {len(reverse_map)}개 단어")

    # 2. 속기록 데이터 로드
    print("속기록 데이터 로드...")
    with open(HISTORY_PAIRS_PATH, "r", encoding="utf-8") as f:
        history = json.load(f)

    frequency = history.get("frequency", {})
    print(f"  빈도 데이터: {len(frequency)}개 단어")

    # 3. 속기록 원본 페어에서 문맥 추출
    # history-hanja-pairs.json의 frequency만으로는 문맥(sentence)이 없음
    # → 캐시된 HTML에서 직접 추출하는 대신,
    #   frequency 데이터를 활용해 "약한 라벨" 생성
    #
    # 접근법: 속기록의 (reading, hanja, count) 데이터를
    #          기존 ETRI 데이터의 sentence에 매칭하여 보강
    #
    # 하지만 실제로 더 효과적인 방법:
    # → 속기록의 문맥(context) 필드를 직접 사용

    # history-hanja-pairs.json에는 frequency만 있고 context가 없음
    # 캐시에서 다시 추출해야 함
    cache_dir = PROJECT_ROOT / ".cache" / "history-db"

    if not cache_dir.exists():
        print("캐시 디렉토리 없음! crawl-history-db.ts를 먼저 실행하세요.")
        print("대안: frequency 기반 약한 라벨 생성으로 전환...")
        generate_weak_labels(reverse_map, frequency)
        return

    # 캐시된 HTML에서 문맥 추출
    print("캐시된 HTML에서 문맥 추출...")
    samples = extract_samples_from_cache(cache_dir, reverse_map)

    if not samples:
        print("추출된 샘플 없음! frequency 기반으로 전환...")
        generate_weak_labels(reverse_map, frequency)
        return

    # 4. JSONL로 저장
    save_samples(samples)


def extract_samples_from_cache(
    cache_dir: Path,
    reverse_map: dict[str, dict[str, str]],
) -> list[dict]:
    """캐시된 HTML에서 (문맥, 단어, 한자) → (sentence, word, scode) 추출"""
    import re

    HANJA_RUN_RE = re.compile(r"[\u4e00-\u9fff]{2,6}")
    samples = []
    html_files = sorted(cache_dir.glob("*.html"))
    print(f"  HTML 파일: {len(html_files)}개")

    for i, html_path in enumerate(html_files):
        if (i + 1) % 100 == 0:
            print(f"  진행: {i + 1}/{len(html_files)} (샘플: {len(samples)}개)")

        html = html_path.read_text(encoding="utf-8", errors="ignore")
        text = clean_html(html)

        # 문장 분리 (마침표, 느낌표, 물음표 기준)
        sentences = re.split(r"[.!?。]\s*", text)

        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 10 or len(sentence) > 200:
                continue

            # 한자 연속 찾기
            for match in HANJA_RUN_RE.finditer(sentence):
                hanja = match.group()

                # reverse_map에서 이 한자에 대응하는 reading + scode 찾기
                for word, hanja_scode in reverse_map.items():
                    if hanja in hanja_scode:
                        scode = hanja_scode[hanja]

                        # 문맥에서 한자를 한글로 대체한 문장 생성
                        # (학습 시 입력은 한글 문장이어야 하므로)
                        korean_sentence = sentence.replace(hanja, word)

                        # 한자가 여전히 많이 남아있으면 품질 낮음 → 스킵
                        remaining_hanja = len(re.findall(r"[\u4e00-\u9fff]", korean_sentence))
                        if remaining_hanja > len(korean_sentence) * 0.3:
                            continue

                        samples.append({
                            "sentence": korean_sentence,
                            "word": word,
                            "scode": scode,
                            "source": "history-db",
                        })

    return samples


def clean_html(html: str) -> str:
    """HTML → 순수 텍스트"""
    import re
    text = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.IGNORECASE)
    text = re.sub(r"<style[\s\S]*?</style>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&#\d+;", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n", "\n", text)
    return text.strip()


def generate_weak_labels(
    reverse_map: dict[str, dict[str, str]],
    frequency: dict[str, dict[str, int]],
):
    """
    문맥 없이 frequency 데이터만으로 약한 라벨 생성
    → 학습 데이터로는 부적합하지만, 통계 확인용
    """
    print("\n=== Frequency 기반 통계 (학습에는 문맥 필요) ===")
    matched = 0
    for word, hanja_counts in frequency.items():
        if word in reverse_map:
            for hanja, count in hanja_counts.items():
                if hanja in reverse_map[word]:
                    matched += 1
    print(f"  scode 매칭 가능: {matched}개 페어")
    print("  주의: 실제 학습에는 캐시된 HTML의 문맥이 필요합니다.")
    print("  crawl-history-db.ts를 실행하여 캐시를 생성하세요.")


def save_samples(samples: list[dict]):
    """JSONL로 저장 + 통계 출력"""
    # 동음이의어만 필터 (같은 word에 다른 scode가 2개+)
    by_word = defaultdict(lambda: defaultdict(int))
    for s in samples:
        by_word[s["word"]][s["scode"]] += 1

    # 실제 다의어 (2개+ scode)만 필터
    ambiguous_words = {w for w, scodes in by_word.items() if len(scodes) >= 2}
    filtered = [s for s in samples if s["word"] in ambiguous_words]

    print(f"\n=== 결과 ===")
    print(f"전체 샘플: {len(samples)}개")
    print(f"다의어 단어: {len(ambiguous_words)}개")
    print(f"다의어 샘플: {len(filtered)}개")

    # 상위 20개 단어
    print(f"\n=== 상위 20개 동음이의어 ===")
    top_words = sorted(ambiguous_words, key=lambda w: -sum(by_word[w].values()))
    for w in top_words[:20]:
        scodes = by_word[w]
        total = sum(scodes.values())
        detail = ", ".join(f"scode={sc}({cnt})" for sc, cnt in sorted(scodes.items(), key=lambda x: -x[1]))
        print(f"  {w} [{total}]: {detail}")

    # 저장
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        for s in filtered:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")

    size_mb = OUTPUT_PATH.stat().st_size / 1024 / 1024
    print(f"\n저장: {OUTPUT_PATH} ({size_mb:.1f}MB, {len(filtered)}개 샘플)")


if __name__ == "__main__":
    main()
