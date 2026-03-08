#!/usr/bin/env python3
"""
WSD 합성 학습 데이터 생성 v2
— 문체 태그 개수 지정 + 띄어쓰기 변형 후처리

카테고리:
  A: 지명 축약 패턴 (경기 등)
  B: 직함/관직 합성어 (국장, 지사 등)
  D: 실전 발견 동음이의어 (경선 등)

Usage:
    # jinserver에서 실행
    cd /home/jinwoo/wsd-data
    source venv/bin/activate
    GEMINI_API_KEY=xxx python3 generate_synthetic_data_v2.py

    # 드라이런 (생성만, 파일 저장 안함)
    GEMINI_API_KEY=xxx python3 generate_synthetic_data_v2.py --dry-run

    # 교차 검증 포함
    GEMINI_API_KEY=xxx python3 generate_synthetic_data_v2.py --verify

환경변수:
    GEMINI_API_KEY: Gemini API 키
"""

import argparse
import json
import os
import random
import sys
import time
from collections import Counter

try:
    import google.generativeai as genai
except ImportError:
    print("pip install google-generativeai 필요")
    sys.exit(1)


# ── 시스템 프롬프트 ──

SYSTEM_PROMPT = """너는 한국어 자연어 처리(NLP) 모델 학습을 위한 '합성 데이터 생성 전문가'야.
너의 임무는 주어진 한자어 동음이의어가 포함된, 실생활에서 흔하게 쓰이는 자연스러운 문장을 생성하는 거야.

[핵심 규칙]
1. 각 의미별로 문맥만 읽어도 어떤 뜻인지 명확히 구별 가능해야 함
2. 타겟 단어가 반드시 문장에 자연스럽게 포함되어야 함
3. 같은 패턴 반복 금지 — 다양한 주어, 서술어, 상황 사용
4. 각 문장은 15자 이상 100자 이하
5. 맞춤법과 띄어쓰기는 정확하게 작성
6. 출력은 반드시 JSON 배열만 출력. 다른 설명, 인사말, 마크다운 코드블록 절대 금지
7. JSON 키: "sentence" (문장), "word" (타겟 단어), "sense" (A 또는 B), "style" (문체 태그)"""

VERIFY_SYSTEM_PROMPT = """너는 한국어 동음이의어 판별 전문가야.
주어진 문장에서 특정 단어가 어떤 의미로 쓰였는지 판단해.
반드시 의미 라벨(A, B, C 등)만 출력해. 다른 설명 금지."""


# ── 타겟 단어 정의 ──

TARGETS = [
    # Category A: 지명 축약
    {
        "word": "경기",
        "category": "A",
        "senses": [
            {"label": "A", "hanja": "京畿", "definition": "경기도의 줄임말. 행정구역.", "scode": "02"},
            {"label": "B", "hanja": "競技", "definition": "기량을 겨루는 운동이나 시합.", "scode": "01"},
        ],
        "prompt_extra": """[추가 지침 — 의미 A]
- 50%는 "도/시/군/구" 없이 지명임이 명확한 문맥 (예: "경기 남부", "경기 지역")
- 30%는 지명+행정기관 복합어 포함 (예: "경기도당", "경기도지사", "경기도청", "경기도의회")
- 나머지 20%는 자유 문맥""",
        "style_counts": {
            "A": [("기사체", 12), ("구어체", 6), ("SNS/블로그체", 3), ("공문서체", 3), ("문어체", 6)],
            "B": [("기사체", 4), ("구어체", 3), ("SNS/블로그체", 2), ("문어체", 1)],
        },
    },
    # Category B: 직함 합성어
    {
        "word": "국장",
        "category": "B",
        "senses": [
            {"label": "A", "hanja": "局長", "definition": "국(局)의 우두머리. 행정 기관의 직위.", "scode": "01"},
            {"label": "B", "hanja": "國葬", "definition": "나라에서 치르는 장례.", "scode": "02"},
        ],
        "prompt_extra": """[추가 지침 — 의미 A]
- 앞에 기관/부서명이 오는 패턴 다양하게: 사무국장, 기획국장, 홍보국장, 문화국장, 환경국장 등
- 인명 + 국장 패턴도 포함: "김철수 국장", "박 국장", "이 국장" 등
- 직함으로서의 국장이 명확한 문맥""",
        "style_counts": {
            "A": [("기사체", 12), ("구어체", 6), ("공문서체", 6), ("문어체", 6)],
            "B": [("기사체", 5), ("문어체", 3), ("구어체", 2)],
        },
    },
    {
        "word": "지사",
        "category": "B",
        "senses": [
            {"label": "A", "hanja": "知事", "definition": "도(道)의 행정을 맡아보는 으뜸 벼슬. 도지사.", "scode": "01"},
            {"label": "B", "hanja": "支社", "definition": "본사에서 갈라져 나온 회사.", "scode": "02"},
        ],
        "prompt_extra": """[추가 지침 — 의미 A]
- 인명 + 지사 패턴 필수: "김동연 지사", "이재명 지사", "박 지사" 등
- "도지사", "지사 선거", "지사직" 등 행정직 맥락
- 의미 B는 회사 지사: "서울 지사", "부산 지사", "지사장" 등""",
        "style_counts": {
            "A": [("기사체", 12), ("구어체", 6), ("공문서체", 4), ("문어체", 4), ("SNS/블로그체", 4)],
            "B": [("기사체", 4), ("구어체", 3), ("문어체", 2), ("공문서체", 1)],
        },
    },
    # Category D: 실전 발견 동음이의어
    {
        "word": "경선",
        "category": "D",
        "senses": [
            {"label": "A", "hanja": "競選", "definition": "후보자를 뽑기 위해 경쟁하는 선거.", "scode": "01"},
            {"label": "B", "hanja": "經線", "definition": "지구의 남극과 북극을 잇는 가상의 선. 자오선.", "scode": "02"},
        ],
        "prompt_extra": """[추가 지침 — 의미 A]
- "예비경선", "본경선", "당내 경선", "경선 레이스" 등 다양한 결합 패턴
- 정치/선거 맥락 명확하게
- 의미 B는 지리/과학 교과서 맥락""",
        "style_counts": {
            "A": [("기사체", 15), ("구어체", 6), ("SNS/블로그체", 3), ("문어체", 6)],
            "B": [("문어체", 5), ("기사체", 3), ("구어체", 2)],
        },
    },
]


# ── 띄어쓰기 변형 후처리 ──

SPACING_RULES = {
    "예비경선": "예비 경선",
    "본경선": "본 경선",
    "사무국장": "사무 국장",
    "기획국장": "기획 국장",
    "홍보국장": "홍보 국장",
    "문화국장": "문화 국장",
    "환경국장": "환경 국장",
    "경기도당": "경기 도당",
    "경기도지사": "경기 도지사",
    "경기도청": "경기 도청",
    "경기도의회": "경기 도의회",
}

SPACING_RATE = 0.12  # 12%


def apply_spacing_noise(items: list[dict], rate: float = SPACING_RATE) -> list[dict]:
    """합성어 경계에서 띄어쓰기 변형 주입 (라벨 유지)"""
    modified = 0
    for item in items:
        if random.random() < rate:
            sent = item["sentence"]
            for original, spaced in SPACING_RULES.items():
                if original in sent:
                    item["sentence"] = sent.replace(original, spaced)
                    item["spacing_modified"] = True
                    modified += 1
                    break
    return items


# ── 프롬프트 빌더 ──

def build_prompt(target: dict) -> str:
    """문체 태그 개수 지정 프롬프트 생성"""
    word = target["word"]
    senses = target["senses"]
    style_counts = target["style_counts"]
    prompt_extra = target.get("prompt_extra", "")

    lines = [f'단어: "{word}"']
    for s in senses:
        lines.append(f'의미 {s["label"]}: {s["hanja"]} — "{s["definition"]}"')

    lines.append("")
    lines.append("[문체별 생성 개수]")
    for s in senses:
        label = s["label"]
        counts = style_counts.get(label, [])
        total = sum(c for _, c in counts)
        lines.append(f"의미 {label} ({s['hanja']}) — 총 {total}개:")
        for style, count in counts:
            lines.append(f"- {style} {count}개")
        lines.append("")

    if prompt_extra:
        lines.append(prompt_extra)
        lines.append("")

    lines.append("출력:")
    return "\n".join(lines)


def build_verify_prompt(word: str, senses: list[dict], sentence: str) -> str:
    """교차 검증 프롬프트"""
    lines = [f'문장: "{sentence}"', f'단어: "{word}"', "의미 후보:"]
    for s in senses:
        lines.append(f'  {s["label"]}: {s["hanja"]} — "{s["definition"]}"')
    lines.append(f'이 문장에서 "{word}"는 어떤 의미? (라벨만 출력)')
    return "\n".join(lines)


# ── LLM 호출 ──

def parse_response(text: str, word: str) -> list[dict]:
    """응답 JSON 파싱"""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
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

    try:
        items = json.loads(text)
        if not isinstance(items, list):
            return []
        valid = []
        for it in items:
            if not isinstance(it, dict):
                continue
            sent = it.get("sentence", "")
            if word not in sent:
                continue
            if not (15 <= len(sent) <= 200):
                continue
            valid.append(it)
        return valid
    except json.JSONDecodeError as e:
        print(f"  JSON 파싱 실패: {e}")
        return []


def generate_for_target(model, target: dict, max_retries: int = 1) -> list[dict]:
    """타겟 단어에 대한 문장 생성 (재시도 포함)"""
    prompt = build_prompt(target)
    word = target["word"]

    all_items = []
    for attempt in range(max_retries + 1):
        try:
            response = model.generate_content(prompt)
            items = parse_response(response.text, word)
            all_items.extend(items)

            # 기대 수량 체크
            expected = sum(c for counts in target["style_counts"].values() for _, c in counts)
            if len(all_items) >= expected * 0.8:  # 80% 이상이면 OK
                break

            if attempt < max_retries:
                print(f"  재시도 ({len(all_items)}/{expected}개)...")
                time.sleep(1)
        except Exception as e:
            print(f"  [ERROR] {word}: {e}")
            if attempt < max_retries:
                time.sleep(2)

    # 중복 제거
    seen = set()
    unique = []
    for it in all_items:
        if it["sentence"] not in seen:
            seen.add(it["sentence"])
            unique.append(it)

    return unique


def verify_sentences(model, target: dict, items: list[dict]) -> list[dict]:
    """교차 검증"""
    word = target["word"]
    senses = target["senses"]
    verified = []
    failed = 0

    for item in items:
        prompt = build_verify_prompt(word, senses, item["sentence"])
        try:
            response = model.generate_content(prompt)
            answer = response.text.strip().upper()
            predicted = answer[0] if answer else ""
            if predicted == item.get("sense", "?"):
                verified.append(item)
            else:
                failed += 1
        except Exception:
            verified.append(item)  # 검증 실패 시 포함
        time.sleep(0.1)

    if failed > 0:
        print(f"    검증 탈락: {failed}개")
    return verified


# ── 메인 ──

def main():
    parser = argparse.ArgumentParser(description="WSD 합성 데이터 v2 (문체 태그 + 띄어쓰기 변형)")
    parser.add_argument("--output", default="synthetic_v2.jsonl", help="출력 파일")
    parser.add_argument("--dry-run", action="store_true", help="드라이런 (출력만, 파일 저장 안함)")
    parser.add_argument("--verify", action="store_true", help="교차 검증")
    parser.add_argument("--no-spacing", action="store_true", help="띄어쓰기 변형 비적용")
    parser.add_argument("--spacing-rate", type=float, default=SPACING_RATE, help="띄어쓰기 변형 비율")
    parser.add_argument("--model", default="gemini-2.5-flash", help="Gemini 모델명")
    # label_map, scode_hanja_map 경로 (scode 매핑에 필요)
    parser.add_argument("--label-map", default=None, help="label_map.json 경로")
    parser.add_argument("--scode-map", default=None, help="wsd_scode_hanja_map.json 경로")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY 환경변수를 설정해주세요.")
        sys.exit(1)

    genai.configure(api_key=api_key)

    gen_model = genai.GenerativeModel(
        model_name=args.model,
        system_instruction=SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.9,
            max_output_tokens=8192,
        ),
    )

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

    # label_map에서 실제 scode → label_id 매핑 로드
    label_map = {}
    if args.label_map and os.path.exists(args.label_map):
        with open(args.label_map) as f:
            label_map = json.load(f)

    # 예상 생성량
    total_expected = 0
    for t in TARGETS:
        n = sum(c for counts in t["style_counts"].values() for _, c in counts)
        total_expected += n

    print("=" * 60)
    print("WSD 합성 데이터 v2 생성")
    print(f"타겟: {len(TARGETS)}개 단어")
    print(f"예상 생성: {total_expected}개 문장")
    print(f"띄어쓰기 변형: {'OFF' if args.no_spacing else f'{args.spacing_rate*100:.0f}%'}")
    print(f"교차 검증: {'ON' if args.verify else 'OFF'}")
    print("=" * 60)

    all_results = []
    total_generated = 0
    total_verified = 0
    total_spacing = 0

    for i, target in enumerate(TARGETS):
        word = target["word"]
        cat = target["category"]
        expected = sum(c for counts in target["style_counts"].values() for _, c in counts)

        print(f"\n[{i+1}/{len(TARGETS)}] {word} (Category {cat}) — 목표 {expected}개")
        for s in target["senses"]:
            sense_total = sum(c for _, c in target["style_counts"].get(s["label"], []))
            print(f"  {s['label']}: {s['hanja']} ({s['definition'][:30]}) → {sense_total}개")

        # 생성
        items = generate_for_target(gen_model, target)
        print(f"  생성: {len(items)}개")

        # 교차 검증
        if args.verify and verify_model and items:
            before = len(items)
            items = verify_sentences(verify_model, target, items)
            print(f"  검증 후: {len(items)}개 (탈락 {before - len(items)}개)")

        # 띄어쓰기 변형
        if not args.no_spacing:
            items = apply_spacing_noise(items, args.spacing_rate)
            spacing_count = sum(1 for it in items if it.get("spacing_modified"))
            if spacing_count > 0:
                print(f"  띄어쓰기 변형: {spacing_count}개")
                total_spacing += spacing_count

        # 분석 출력
        sense_counts = Counter(it.get("sense", "?") for it in items)
        style_counts = Counter(it.get("style", "미지정") for it in items)
        print(f"  의미별: {dict(sense_counts)}")
        print(f"  문체별: {dict(style_counts)}")

        # scode, label_id 매핑
        sense_map = {s["label"]: s for s in target["senses"]}
        for it in items:
            sense_label = it.get("sense", "?")
            sense_info = sense_map.get(sense_label, {})

            # label_map에서 실제 label_id 조회
            word_scodes = label_map.get(word, {})
            scode = sense_info.get("scode", "01")
            label_id = word_scodes.get(scode, 0)

            it["word"] = word
            it["scode"] = scode
            it["hanja"] = sense_info.get("hanja", "?")
            it["label"] = label_id
            it["num_senses"] = len(target["senses"])
            it["source"] = "synthetic_v2"
            it["category"] = cat

        all_results.extend(items)
        total_generated += len(items)
        time.sleep(1)  # rate limit

    # 저장
    if not args.dry_run:
        with open(args.output, "w", encoding="utf-8") as f:
            for item in all_results:
                record = {
                    "sentence": item["sentence"],
                    "word": item["word"],
                    "scode": item["scode"],
                    "label": item["label"],
                    "num_senses": item["num_senses"],
                    "source": item["source"],
                    "hanja": item["hanja"],
                }
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
        print(f"\n저장: {args.output}")

    # 요약
    print(f"\n{'=' * 60}")
    print(f"v2 생성 완료!")
    print(f"  총 생성: {total_generated}개 문장")
    print(f"  띄어쓰기 변형: {total_spacing}개")
    if not args.dry_run:
        print(f"  출력 파일: {args.output}")
        print(f"\n다음 단계:")
        print(f"  1. 품질 확인: head -20 {args.output}")
        print(f"  2. 기존 데이터에 병합:")
        print(f"     cat dataset/train.jsonl {args.output} > dataset/train_augmented_v2.jsonl")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
