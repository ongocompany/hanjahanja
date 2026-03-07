#!/usr/bin/env python3
"""
LLM(Gemini)을 활용한 WSD 합성 학습 데이터 생성 v2

전략 (프롬프트 설계 문서 기반):
  1. 불균형 분석: 소수 의미 (샘플 < 30)만 타겟
  2. 대립쌍 프롬프트: 한 단어의 모든 의미를 한 번에 요청
  3. 뜻풀이 포함: 우리말샘 정의로 의미 명확화
  4. 소수 의미 집중: 불균형 수준에 따라 생성량 차등
  5. 교차 검증: Round-trip으로 의미 일치 확인

비용: Gemini 2.5 Flash (thinking OFF) → ~$0.50 (전체)

Usage:
    # 드라이런 (10개 단어만)
    python generate_synthetic_data.py \
        --data-dir /home/jinwoo/wsd-data \
        --output synthetic_data.jsonl \
        --dry-run --limit 10

    # 전체 실행
    python generate_synthetic_data.py \
        --data-dir /home/jinwoo/wsd-data \
        --output synthetic_data.jsonl

    # 교차 검증 포함
    python generate_synthetic_data.py \
        --data-dir /home/jinwoo/wsd-data \
        --output synthetic_data.jsonl \
        --verify

환경변수:
    GEMINI_API_KEY: Gemini API 키
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from collections import Counter, defaultdict

try:
    import google.generativeai as genai
except ImportError:
    print("pip install google-generativeai 필요")
    sys.exit(1)


# ── 프롬프트 ──

SYSTEM_PROMPT = """너는 한국어 자연어 처리(NLP) 모델 학습을 위한 '합성 데이터 생성 전문가'야.
너의 임무는 주어진 한자어 동음이의어가 포함된, 실생활에서 흔하게 쓰이는 자연스러운 문장을 생성하는 거야.

[핵심 규칙]
1. 각 의미별로 문맥만 읽어도 어떤 뜻인지 명확히 구별 가능해야 함
2. 문체를 다양하게 섞어: 뉴스 기사, 일상 대화, 블로그, SNS, 교과서, 소설, 업무 메일 등
3. 타겟 단어가 반드시 문장에 자연스럽게 포함되어야 함
4. 같은 패턴 반복 금지 — 다양한 주어, 서술어, 상황 사용
5. 각 문장은 15자 이상 100자 이하
6. 출력은 반드시 JSON 배열만 출력. 다른 설명, 인사말, 마크다운 코드블록 절대 금지
7. JSON 키: "sentence" (한글 문장), "word" (타겟 단어), "sense" (의미 라벨: "A", "B", "C" 등)"""


FEW_SHOT_EXAMPLES = """[예시 1]
단어: "사과"
의미 A: 沙果 — "먹는 과일의 하나. 사과나무의 열매."
의미 B: 謝過 — "자기의 잘못을 인정하고 용서를 빎."

출력:
[
  {"sentence": "아침에 일어났더니 엄마가 깎아놓은 사과가 있길래 다 먹었어.", "word": "사과", "sense": "A"},
  {"sentence": "올해 사과 농사가 풍년이라 가격이 많이 내렸대.", "word": "사과", "sense": "A"},
  {"sentence": "사과 한 박스 시켰는데 상태가 너무 좋다.", "word": "사과", "sense": "A"},
  {"sentence": "네가 먼저 잘못했으니까 빨리 사과하는 게 좋을 것 같아.", "word": "사과", "sense": "B"},
  {"sentence": "회사 측에서 공식 사과문을 발표했다.", "word": "사과", "sense": "B"},
  {"sentence": "진심 어린 사과 없이는 관계 회복이 어렵다.", "word": "사과", "sense": "B"}
]

[예시 2]
단어: "인상"
의미 A: 印象 — "어떤 대상에 대하여 마음속에 새겨지는 느낌."
의미 B: 引上 — "물건값, 봉급, 요금 따위를 올림."
의미 C: 人相 — "사람 얼굴의 생김새."

출력:
[
  {"sentence": "그 사람 첫인상이 되게 좋았어.", "word": "인상", "sense": "A"},
  {"sentence": "강렬한 인상을 남기는 발표였다.", "word": "인상", "sense": "A"},
  {"sentence": "내년부터 전기요금이 인상된다고 한다.", "word": "인상", "sense": "B"},
  {"sentence": "최저임금 인상 폭을 놓고 논쟁이 이어지고 있다.", "word": "인상", "sense": "B"},
  {"sentence": "인상이 험악한 남자가 골목에 서 있었다.", "word": "인상", "sense": "C"},
  {"sentence": "경찰이 용의자의 인상착의를 공개했다.", "word": "인상", "sense": "C"}
]"""


VERIFY_SYSTEM_PROMPT = """너는 한국어 동음이의어 판별 전문가야.
주어진 문장에서 특정 단어가 어떤 의미로 쓰였는지 판단해.
반드시 의미 라벨(A, B, C 등)만 출력해. 다른 설명 금지."""


def build_contrastive_prompt(word: str, senses: list[dict], counts_per_sense: dict[str, int]) -> str:
    """대립쌍 생성 프롬프트 구성

    Args:
        word: 타겟 단어
        senses: [{"label": "A", "hanja": "漢字", "definition": "뜻풀이", "scode": "01", "count": 50}]
        counts_per_sense: {"A": 50, "B": 10} — 의미별 요청 문장 수
    """
    lines = [f'단어: "{word}"']
    for s in senses:
        defn = s["definition"][:100]  # 100자 제한
        lines.append(f'의미 {s["label"]}: {s["hanja"]} — "{defn}"')

    lines.append("")
    count_parts = []
    for s in senses:
        n = counts_per_sense.get(s["label"], 0)
        if n > 0:
            count_parts.append(f'의미 {s["label"]} {n}개')
    lines.append(f'각 의미별 문장 수: {", ".join(count_parts)}')
    lines.append("출력:")
    return "\n".join(lines)


def build_verify_prompt(word: str, senses: list[dict], sentence: str) -> str:
    """교차 검증 프롬프트"""
    lines = [f'문장: "{sentence}"', f'단어: "{word}"', "의미 후보:"]
    for s in senses:
        lines.append(f'  {s["label"]}: {s["hanja"]} — "{s["definition"][:60]}"')
    lines.append(f'이 문장에서 "{word}"는 어떤 의미? (A/B/C 중 하나만 출력)')
    return "\n".join(lines)


# ── 데이터 로드 ──

def load_targets(data_dir: str) -> list[dict]:
    """
    합성 데이터 타겟 단어 로드 + 불균형 분석

    반환: [{
        "word": "자신",
        "senses": [
            {"scode": "01", "hanja": "自身", "label_id": 0, "train_count": 2125,
             "definition": "그 사람의 몸...", "label": "A"},
            {"scode": "02", "hanja": "自信", "label_id": 1, "train_count": 34,
             "definition": "어떤 일을 해낼...", "label": "B"},
        ],
        "imbalance_ratio": 0.016,
    }]
    """
    label_map_path = os.path.join(data_dir, "dataset", "label_map.json")
    scode_map_path = os.path.join(data_dir, "onnx", "wsd_scode_hanja_map.json")
    defs_path = os.path.join(data_dir, "scode_definitions.json")
    train_path = os.path.join(data_dir, "dataset", "train.jsonl")

    with open(label_map_path) as f:
        label_map = json.load(f)
    with open(scode_map_path) as f:
        scode_hanja_map = json.load(f)

    # 정의 로드 (없으면 빈 dict)
    definitions = {}
    if os.path.exists(defs_path):
        with open(defs_path) as f:
            definitions = json.load(f)

    # 학습 데이터 카운트
    word_scode_counts = defaultdict(Counter)
    with open(train_path, encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)
            word_scode_counts[item["word"]][item["scode"]] += 1

    targets = []
    labels = "ABCDEFGHIJ"

    for word, scodes in label_map.items():
        if len(scodes) < 2:
            continue

        hanja_map = scode_hanja_map.get(word, {})
        counts = word_scode_counts[word]

        # 한자 매핑이 존재하는 의미만 필터
        valid_senses = []
        for scode, label_id in sorted(scodes.items()):
            hanja = hanja_map.get(scode, "?")
            # "?"이거나 비한자이면 스킵
            if hanja == "?" or hanja.startswith("[") or hanja.startswith("←"):
                continue
            count = counts.get(scode, 0)
            defn = definitions.get(f"{word}|{scode}", hanja)
            valid_senses.append({
                "scode": scode,
                "hanja": hanja,
                "label_id": label_id,
                "train_count": count,
                "definition": defn,
            })

        if len(valid_senses) < 2:
            continue  # 한자 의미가 2개 이상인 것만

        # 라벨 할당 (A, B, C...)
        for i, s in enumerate(valid_senses):
            s["label"] = labels[i] if i < len(labels) else f"L{i}"

        # 불균형 비율
        max_count = max(s["train_count"] for s in valid_senses)
        min_count = min(s["train_count"] for s in valid_senses)
        ratio = min_count / max_count if max_count > 0 else 0

        # 소수 의미가 30개 미만인 단어만 타겟
        has_minority = any(s["train_count"] < 30 for s in valid_senses)
        if not has_minority:
            continue

        targets.append({
            "word": word,
            "senses": valid_senses,
            "imbalance_ratio": ratio,
        })

    # 불균형 심한 순 정렬
    targets.sort(key=lambda x: x["imbalance_ratio"])
    return targets


def decide_counts(senses: list[dict]) -> dict[str, int]:
    """의미별 생성 문장 수 결정 (불균형 기반)"""
    max_count = max(s["train_count"] for s in senses)
    result = {}

    for s in senses:
        count = s["train_count"]
        if count >= 100:
            # 이미 충분 → 소량만 (다양성 보강)
            result[s["label"]] = 5
        elif count >= 30:
            # 중간 → 적당히
            result[s["label"]] = 15
        elif count >= 10:
            # 부족 → 많이
            result[s["label"]] = 30
        else:
            # 극소 → 최대
            result[s["label"]] = 50

    return result


# ── LLM 생성 ──

def generate_contrastive(
    model,
    word: str,
    senses: list[dict],
    counts_per_sense: dict[str, int],
) -> list[dict]:
    """대립쌍 생성: 한 단어의 모든 의미를 한 번에 요청"""
    prompt = FEW_SHOT_EXAMPLES + "\n\n" + build_contrastive_prompt(word, senses, counts_per_sense)

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        # JSON 파싱 (마크다운 코드블록 제거)
        if text.startswith("```"):
            lines = text.split("\n")
            # 첫 줄(```json)과 마지막 줄(```) 제거
            json_lines = []
            in_block = False
            for line in lines:
                if line.strip().startswith("```") and not in_block:
                    in_block = True
                    continue
                elif line.strip() == "```" and in_block:
                    break
                elif in_block:
                    json_lines.append(line)
            text = "\n".join(json_lines).strip()

        sentences = json.loads(text)
        if not isinstance(sentences, list):
            return []

        # 라벨 → scode 매핑
        label_to_sense = {s["label"]: s for s in senses}

        valid = []
        for item in sentences:
            if not isinstance(item, dict):
                continue
            sent = item.get("sentence", "")
            sense_label = item.get("sense", "")

            if not sent or sense_label not in label_to_sense:
                continue
            if word not in sent:
                continue
            if not (15 <= len(sent) <= 200):
                continue

            sense = label_to_sense[sense_label]
            valid.append({
                "sentence": sent,
                "word": word,
                "sense_label": sense_label,
                "scode": sense["scode"],
                "hanja": sense["hanja"],
                "label_id": sense["label_id"],
            })

        return valid

    except Exception as e:
        print(f"  [ERROR] {word}: {e}")
        return []


def generate_with_retry(
    model,
    word: str,
    senses: list[dict],
    counts_per_sense: dict[str, int],
    max_retries: int = 2,
) -> list[dict]:
    """재시도 포함 생성"""
    all_results = []
    remaining = dict(counts_per_sense)

    for attempt in range(max_retries + 1):
        result = generate_contrastive(model, word, senses, remaining)
        all_results.extend(result)

        # 의미별 달성 확인
        got = Counter(r["sense_label"] for r in all_results)
        all_done = all(got.get(label, 0) >= count for label, count in counts_per_sense.items())
        if all_done:
            break

        # 부족한 것만 재요청
        remaining = {}
        for label, count in counts_per_sense.items():
            need = count - got.get(label, 0)
            if need > 0:
                remaining[label] = need

        if not remaining:
            break
        if attempt < max_retries:
            time.sleep(1)

    # 중복 제거
    seen = set()
    unique = []
    for item in all_results:
        if item["sentence"] not in seen:
            seen.add(item["sentence"])
            unique.append(item)

    # 의미별로 요청 수만큼만
    per_sense = defaultdict(list)
    for item in unique:
        per_sense[item["sense_label"]].append(item)

    final = []
    for label, count in counts_per_sense.items():
        final.extend(per_sense.get(label, [])[:count])

    return final


def verify_sentences(
    model,
    word: str,
    senses: list[dict],
    sentences: list[dict],
) -> list[dict]:
    """교차 검증: 생성된 문장의 의미가 맞는지 LLM에게 역질문"""
    verified = []
    failed = 0

    for item in sentences:
        prompt = build_verify_prompt(word, senses, item["sentence"])
        try:
            response = model.generate_content(prompt)
            answer = response.text.strip().upper()
            # A, B, C 등에서 첫 글자만
            predicted = answer[0] if answer else ""
            if predicted == item["sense_label"]:
                verified.append(item)
            else:
                failed += 1
        except Exception:
            # 검증 실패 시 일단 포함
            verified.append(item)
        time.sleep(0.1)

    if failed > 0:
        print(f"    검증 탈락: {failed}개")
    return verified


# ── 메인 ──

def main():
    parser = argparse.ArgumentParser(description="WSD 합성 데이터 생성 v2 (대립쌍 + 뜻풀이)")
    parser.add_argument("--data-dir", required=True, help="WSD 데이터 디렉토리")
    parser.add_argument("--output", required=True, help="출력 JSONL 파일 경로")
    parser.add_argument("--dry-run", action="store_true", help="드라이런 (소수 단어만)")
    parser.add_argument("--limit", type=int, default=0, help="처리할 단어 수 제한 (0=전부)")
    parser.add_argument("--model", default="gemini-2.5-flash", help="Gemini 모델명")
    parser.add_argument("--resume", action="store_true", help="이전 실행 이어서")
    parser.add_argument("--verify", action="store_true", help="교차 검증 (Round-trip)")
    args = parser.parse_args()

    # API 키
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY 환경변수를 설정해주세요.")
        sys.exit(1)

    genai.configure(api_key=api_key)

    # Gemini 모델 초기화 (thinking OFF)
    gen_model = genai.GenerativeModel(
        model_name=args.model,
        system_instruction=SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.9,  # 다양성을 위해 높게
            max_output_tokens=8192,
        ),
    )

    # 검증용 모델 (낮은 temperature)
    verify_model = None
    if args.verify:
        verify_model = genai.GenerativeModel(
            model_name=args.model,
            system_instruction=VERIFY_SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=16,
            ),
        )

    # 타겟 단어 로드
    targets = load_targets(args.data_dir)
    print(f"합성 데이터 타겟: {len(targets)}개 단어 (소수 의미 < 30 샘플)")

    # resume 지원
    done_words = set()
    if args.resume and os.path.exists(args.output):
        with open(args.output, "r") as f:
            for line in f:
                item = json.loads(line)
                done_words.add(item["word"])
        print(f"이미 생성: {len(done_words)}개 단어 (이어서)")
        targets = [t for t in targets if t["word"] not in done_words]

    if args.limit > 0:
        targets = targets[:args.limit]

    # 생성량 예측
    total_expected = 0
    for t in targets:
        counts = decide_counts(t["senses"])
        total_expected += sum(counts.values())

    print(f"처리 대상: {len(targets)}개 단어")
    print(f"예상 생성: {total_expected}개 문장")
    print(f"예상 API 호출: {len(targets)}회")

    if args.dry_run:
        print(f"\n[드라이런] {len(targets)}개 단어 생성")

    # 생성 시작
    total_generated = 0
    total_verified = 0
    total_dropped = 0

    mode = "a" if args.resume else "w"
    with open(args.output, mode, encoding="utf-8") as fout:
        for i, target in enumerate(targets):
            word = target["word"]
            senses = target["senses"]
            counts = decide_counts(senses)

            sense_summary = " | ".join(
                f'{s["hanja"]}({s["train_count"]}→+{counts[s["label"]]})'
                for s in senses
            )
            print(f"\n[{i+1}/{len(targets)}] {word}: {sense_summary}")

            # 생성
            sentences = generate_with_retry(gen_model, word, senses, counts)

            # 교차 검증
            if args.verify and verify_model and sentences:
                before = len(sentences)
                sentences = verify_sentences(verify_model, word, senses, sentences)
                dropped = before - len(sentences)
                total_dropped += dropped

            # 저장
            sense_counts = Counter()
            for item in sentences:
                record = {
                    "sentence": item["sentence"],
                    "word": word,
                    "scode": item["scode"],
                    "label": item["label_id"],
                    "num_senses": len(senses),
                    "source": "synthetic_gemini",
                    "hanja": item["hanja"],
                }
                fout.write(json.dumps(record, ensure_ascii=False) + "\n")
                sense_counts[item["hanja"]] += 1

            total_generated += len(sentences)
            counts_str = ", ".join(f"{h}:{c}" for h, c in sense_counts.items())
            status = f"✅ {len(sentences)}개 ({counts_str})" if sentences else "❌ 0개"
            print(f"  → {status}")

            # Rate limit
            time.sleep(0.5)

            # 10단어마다 flush + 진행률
            if (i + 1) % 10 == 0:
                fout.flush()
                print(f"\n  --- 진행: {i+1}/{len(targets)} | 생성: {total_generated}개 ---")

    # 요약
    print(f"\n{'='*60}")
    print(f"완료!")
    print(f"  생성 문장: {total_generated}개")
    if args.verify:
        print(f"  검증 탈락: {total_dropped}개")
    print(f"  출력 파일: {args.output}")
    print(f"{'='*60}")

    print(f"\n다음 단계:")
    print(f"  1. 품질 확인: head -30 {args.output}")
    print(f"  2. 기존 데이터와 병합:")
    print(f"     cat {args.data_dir}/dataset/train.jsonl {args.output} > {args.data_dir}/dataset/train_augmented.jsonl")
    print(f"  3. 재학습:")
    print(f"     python train_wsd.py --dataset-dir {args.data_dir}/dataset --model-name klue/roberta-base ...")


if __name__ == "__main__":
    main()
