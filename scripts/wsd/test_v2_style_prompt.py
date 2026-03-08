#!/usr/bin/env python3
"""
v2 합성 데이터 프롬프트 샘플 테스트
— 문체별 개수 지정 방식이 실제로 잘 작동하는지 확인

Usage:
    GEMINI_API_KEY=xxx python scripts/wsd/test_v2_style_prompt.py
"""

import json
import os
import sys

try:
    import google.generativeai as genai
except ImportError:
    print("pip install google-generativeai 필요")
    sys.exit(1)


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


# ── 테스트 케이스 ──

TEST_CASES = [
    {
        "word": "경기",
        "desc": "지명 축약 패턴",
        "prompt": """단어: "경기"
의미 A: 京畿 — "경기도의 줄임말. 행정구역."
의미 B: 競技 — "기량을 겨루는 운동이나 시합."

[문체별 생성 개수]
의미 A (京畿):
- 기사체 4개
- 구어체 2개
- SNS/블로그체 1개
- 공문서체 1개

의미 B (競技):
- 기사체 3개
- 구어체 2개
- SNS/블로그체 1개

[추가 지침 — 의미 A]
- 50%는 "도/시/군/구" 없이 지명임이 명확한 문맥 (예: "경기 남부", "경기 지역")
- 30%는 지명+행정기관 복합어 포함 (예: "경기도당", "경기도지사", "경기도청")

출력:""",
    },
    {
        "word": "국장",
        "desc": "직함 합성어 패턴",
        "prompt": """단어: "국장"
의미 A: 局長 — "국(局)의 우두머리. 행정 기관의 직위."
의미 B: 國葬 — "나라에서 치르는 장례."

[문체별 생성 개수]
의미 A (局長):
- 기사체 4개
- 구어체 2개
- 공문서체 2개

의미 B (國葬):
- 기사체 3개
- 문어체 1개

[추가 지침 — 의미 A]
- 앞에 기관/부서명이 오는 패턴 다양하게: 사무국장, 기획국장, 홍보국장, 문화국장 등
- 인명 + 국장 패턴도 포함: "김철수 국장", "박 국장"

출력:""",
    },
    {
        "word": "경선",
        "desc": "띄어쓰기 민감 패턴",
        "prompt": """단어: "경선"
의미 A: 競選 — "후보자를 뽑기 위해 경쟁하는 선거."
의미 B: 經線 — "지구의 남극과 북극을 잇는 가상의 선."

[문체별 생성 개수]
의미 A (競選):
- 기사체 5개
- 구어체 2개
- SNS/블로그체 1개

의미 B (經線):
- 문어체/교과서체 3개
- 기사체 1개

[추가 지침 — 의미 A]
- "예비경선", "본경선", "당내 경선" 등 다양한 결합 패턴 사용
- 정치/선거 맥락 명확하게

출력:""",
    },
]


def parse_response(text: str, word: str) -> list[dict]:
    """응답 텍스트에서 JSON 파싱"""
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
        return [it for it in items if isinstance(it, dict) and word in it.get("sentence", "")]
    except json.JSONDecodeError as e:
        print(f"  JSON 파싱 실패: {e}")
        print(f"  원본: {text[:200]}...")
        return []


def analyze_results(items: list[dict]):
    """문체별, 의미별 분포 분석"""
    from collections import Counter

    style_counts = Counter()
    sense_counts = Counter()
    sense_style = Counter()

    for it in items:
        style = it.get("style", "미지정")
        sense = it.get("sense", "?")
        style_counts[style] += 1
        sense_counts[sense] += 1
        sense_style[f"{sense}/{style}"] += 1

    print(f"\n  === 분석 ===")
    print(f"  총 문장: {len(items)}개")
    print(f"  의미별: {dict(sense_counts)}")
    print(f"  문체별: {dict(style_counts)}")
    print(f"  의미x문체:")
    for key in sorted(sense_style.keys()):
        print(f"    {key}: {sense_style[key]}개")


def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY 환경변수를 설정해주세요.")
        sys.exit(1)

    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.9,
            max_output_tokens=8192,
        ),
    )

    print("=" * 60)
    print("v2 문체 태그 프롬프트 샘플 테스트")
    print("=" * 60)

    for tc in TEST_CASES:
        print(f"\n{'─' * 50}")
        print(f"테스트: {tc['word']} ({tc['desc']})")
        print(f"{'─' * 50}")

        response = model.generate_content(tc["prompt"])
        raw = response.text.strip()

        items = parse_response(raw, tc["word"])

        if items:
            for it in items:
                style_tag = it.get("style", "")
                sense = it.get("sense", "?")
                print(f"  [{sense}][{style_tag}] {it['sentence']}")
            analyze_results(items)
        else:
            print(f"  파싱 실패. 원본 응답:")
            print(f"  {raw[:500]}")

    print(f"\n{'=' * 60}")
    print("테스트 완료! 위 결과를 보고 문체 분포가 잘 지켜지는지 확인해주세요.")
    print("=" * 60)


if __name__ == "__main__":
    main()
