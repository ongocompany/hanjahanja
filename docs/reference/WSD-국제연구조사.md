# WSD (Word Sense Disambiguation) 국제 연구 조사 보고서

> 작성일: 2026-03-07
> 목적: 한자한자 WSD 모델 개선을 위한 국제 사례 조사

---

## 현재 문제 요약

- KcBERT 기반 WSD 모델: **93.7%가 문맥 무관하게 같은 답만 반환**
- 3,759개 문제 단어 (빈도 역전, 빈도 유사 등)
- 실질적으로 WSD가 아니라 빈도 기반 룩업 테이블과 동일한 상태

---

## 1. 일본어 (Japanese) — 가장 유사한 문제

### 1.1 구조적 유사성

| 일본어 IME | 한자한자 |
|---|---|
| ひらがな → 漢字 (가나→한자) | 한글 → 漢字 (독음→한자) |
| 사용자가 후보 선택 가능 | 자동 변환 (선택 불가) |
| 분절(segmentation) 문제 포함 | 형태소 분석기가 해결 |

### 1.2 일본어 IME 기술 발전사

1. **1세대 (빈도)**: 각 음절에서 가장 흔한 한자 선택 — 우리 현재 단계
2. **2세대 (N-gram)**: Bigram/Trigram 언어 모델 + Viterbi 탐색
3. **3세대 (통계+적응)**: 사용자 히스토리 반영 + 도메인별 모델 — Sogou가 혁신
4. **4세대 (신경망)**: Transformer 기반 seq2seq

### 1.3 Google Japanese Input (Mozc) 아키텍처

오픈소스 (github.com/google/mozc)로 내부 구조 확인 가능:

```
[입력 히라가나]
    → [래티스(Lattice) 구성] ← 시스템 사전 + 사용자 사전
    → [Viterbi 탐색] ← 언어 모델 (bigram/trigram)
    → [리랭킹] ← 사용자 히스토리 + 최신 빈도
    → [상위 N개 후보 출력]
```

비용 함수:
```
총 비용 = Σ(단어 비용: -log P(word)) + Σ(연결 비용: -log P(word_i | word_{i-1}))
```

### 1.4 일본어에서 배울 핵심 교훈

**"대부분은 사전으로 해결되고, 모델은 진짜 모호한 것만 처리하면 된다"**

- 일본어 IME 30년의 결론
- 우리 KcBERT가 93.7% context-insensitive한 건 모델이 나쁜 게 아니라, **93%의 한자어는 문맥이 필요 없기 때문**
- 사전 룩업 + 모호한 단어만 경량 모델로 처리하는 **하이브리드 구조**가 정답

### 1.5 관련 논문/리소스

- Mori & Neubig (2014): "Word-based Partial Annotation for Efficient Corpus Construction"
- Kudo et al. (2004): "Applying CRF to Japanese Morphological Analysis" (MeCab의 이론)
- Komachi et al. (2008): "Japanese input method with a large language model"
- SENSEVAL-2 Japanese task (2001): 일본어 WSD 공식 shared task
- BCCWJ: 일본어 균형 코퍼스 (의미 태깅 포함)

---

## 2. 중국어 (Chinese) — Pinyin→Hanzi 변환

### 2.1 거의 동일한 문제 구조

중국어 IME의 병음→한자 변환 = 한국어 독음→한자 변환

- "shi"에 대응하는 한자가 100개 이상 (是, 十, 时, 石, 食, 事, 世, 市...)
- 문맥 없이는 변환 불가능

### 2.2 주요 기술

#### Lattice/Trellis 기반 디코딩
```
입력:  "xue xi han yu"
후보:  [學,雪,血,穴] [習,西,息,喜] [漢,韓,寒,汗] [語,雨,魚,玉]
       → 격자 구성 + 비터비 탐색 → 學習漢語
```

#### BERT 기반 접근
- **ChineseBERT** (Sun et al., ACL 2021): 글자 모양(glyph) + 병음(pinyin)을 임베딩에 추가
- **PLOME** (Liu et al., 2021): 병음 활용 사전학습 모델
- **FASPell** (Hong et al., EMNLP 2019): BERT 기반 중국어 맞춤법 교정

### 2.3 중국어 ASR의 동음이의어 처리

```
음성 → 음향 모델 → 음소/병음 후보 (N-best)
                       ↓
            언어 모델(LM)로 리스코어링
                       ↓
            최종 한자 문장 출력
```

- **Shallow Fusion**: ASR score + λ × LM score
- **Deep Fusion**: 음향 모델과 LM을 하나의 네트워크로 통합

### 2.4 중국어에서 배울 점

| 중국어 IME 전략 | 우리 적용 |
|---|---|
| 단어 사전 우선 매칭 | 한자어 사전 DB (이미 있음) |
| N-gram 언어 모델 | 한자어 연어(collocation) 통계 |
| 사용자 적응 | 사용자별 학습 기록 반영 |
| 격자 + 비터비 | 복합어 분해 시 최적 경로 탐색 |

---

## 3. 한국어 WSD 학술 현황

### 3.1 주요 기관 연구

| 기관 | 연구 |
|---|---|
| KAIST | CoreNet (Korean WordNet), DAG-structured BERT for WSD |
| SNU | 형태소 기반 토크나이저가 WSD에 미치는 영향 |
| ETRI | ExoBrain 프로젝트 — WSD 모듈 포함 |
| 국립국어원 | 세종 의미 태깅 말뭉치, 모두의 말뭉치 |

### 3.2 한국어 BERT 모델 비교 (WSD 용도)

| 모델 | 학습 데이터 | WSD 적합성 | 비고 |
|---|---|---|---|
| KcBERT (현재 사용) | 댓글 10GB | **약함** | 댓글 도메인 편향 |
| KoBERT | 위키 5M문장 | 보통 | 학습 데이터 적음 |
| KR-BERT-morph | 위키+뉴스 | **좋음** | 형태소 인식 |
| **KLUE-RoBERTa-large** | 다양 62GB | **가장 좋음** | 1순위 교체 후보 |
| KoELECTRA | 다양 | 좋음 | 효율적 학습 |

### 3.3 KLUE 벤치마크

- NeurIPS 2021 Datasets & Benchmarks Track 논문
- 8개 태스크 (TC, STS, NLI, NER, RE, DP, MRC, DST)
- **WSD 전용 태스크는 없음** — 한국어 WSD 표준 벤치마크 부재
- KLUE-RoBERTa-large가 대부분 태스크에서 최강

### 3.4 한국어 WSD 데이터셋

1. **세종 의미 태깅 말뭉치**: ~200K+ 문장, 표준국어대사전 의미 번호
2. **모두의 말뭉치 의미 분석**: corpus.korean.go.kr, 우리말샘 의미 ID
3. **KorLex**: KAIST, ~150K+ synsets, WordNet 매핑

### 3.5 산업계 동향

- 네이버/카카오: 명시적 WSD 모듈 대신 **대규모 LM이 암묵적으로 처리**
- HyperCLOVA, KoGPT 등 대형 모델이 문맥 내에서 다의어 해소
- 실시간 서비스에서는 사전+규칙+경량모델 하이브리드

---

## 4. LLM 기반 합성 데이터 생성 (Synthetic Data for WSD)

### 4.1 핵심 접근법

**LLM-as-Annotator 패턴:**
```
1. 문제 단어 + 가능한 한자 의미 목록 정의
2. LLM에게 각 의미별 예문 생성 요청
3. 다단계 필터링으로 품질 보장
4. 소형 모델 파인튜닝
```

### 4.2 관련 논문

- **"AnnoLLM"** (2023, arXiv:2303.16854): LLM을 데이터 어노테이터로 활용, 자기 검증
- **"Is ChatGPT a Good WSD Solver?"** (2023): GPT-4가 영어 WSD에서 near-SOTA
- **"Self-Instruct"** (Wang et al., 2023): LLM으로 instruction-following 데이터 생성
- **"BEM"** (Blevins & Zettlemoyer, 2020): Bi-encoder WSD — 문맥 vs 정의 매칭

### 4.3 Hard Negative Mining

모델이 무시하는 소수(minority) 의미에 집중 데이터 생성:

```python
# 최소 대립쌍 (Minimal Pairs) 생성
# 같은 문장 구조, 다른 한자 의미

"국가 안보를 보장(保障)하기 위한 조치다."
"문화재를 안전하게 보장(保藏)하기 위한 조치다."
```

### 4.4 비용 추정

| 모델 | 1K 문장당 비용 | 품질 |
|---|---|---|
| GPT-4o | $2-5 | 최고 |
| Claude Sonnet | $1.5-3 | 최고 (한국어 특히) |
| GPT-4o-mini | $0.15-0.30 | 좋음 |
| Claude Haiku | $0.05-0.15 | 좋음 |

**3,759개 단어 전체: 약 $100-150 예상** (Tiered approach)

### 4.5 품질 필터링 파이프라인

```
Stage 1: Self-Consistency — 3회 생성, 합의된 것만 (15-25% 제거)
Stage 2: Cross-Model — A로 생성, B로 검증 (5-10% 추가 제거)
Stage 3: Round-Trip — 생성문장→다른 LLM이 의미 예측→일치 확인
Stage 4: Diversity — 임베딩 유사도로 중복 제거 (cos sim > 0.92)
Stage 5: Human Spot-Check — 5% 샘플 사람 검수
```

---

## 5. GlossBERT 방식 — 가장 유망한 단기 해결책

### 왜 GlossBERT인가?

- 별도 라벨 데이터 없이도 작동 (우리말샘 사전 정의만 활용)
- 새로운 단어 추가 시 재학습 불필요 (사전 정의만 추가)
- 형의 문제에 최적: 이미 사전 정의를 보유

### 작동 원리

```
입력: "도시의 수도를 방문했다"
후보:
  A) 首都 — "한 나라의 중앙 정부가 있는 도시"
  B) 水道 — "음료수나 생활용수를 보내는 시설"
  C) 修道 — "도를 닦음, 종교적 수행"

방법:
  1. 문맥 + 타겟 단어 → BERT 인코딩 → 벡터 v_context
  2. 각 정의 → BERT 인코딩 → 벡터 v_def_A, v_def_B, v_def_C
  3. cos_sim(v_context, v_def_A) = 0.85 ← 최고
     cos_sim(v_context, v_def_B) = 0.62
     cos_sim(v_context, v_def_C) = 0.41
  4. 정답: 首都
```

---

## 6. 종합 전략 제안

### Phase 1: Quick Wins (1-2주)

1. **모호/비모호 분리**: 3,759개 중 사전 룩업으로 확정 가능한 건 분리
   - 실제 중의적인 건 500-1,000개로 줄어들 것
2. **기본 모델 교체**: KcBERT → KLUE-RoBERTa-large (기대 3-8% 향상)

### Phase 2: GlossBERT (2-4주)

3. **정의 기반 매칭**: 우리말샘 정의로 GlossBERT 방식 구현
   - 라벨 데이터 불필요, 기대 정확도 80-90%

### Phase 3: 합성 데이터 생성 (4-8주)

4. **LLM 데이터 생성**: Claude/GPT로 의미별 50-100문장
   - Contrastive pairs (대립쌍) 중심
   - Hard negative mining (소수 의미 집중)
   - 비용: $100-150
5. **모두의 말뭉치 확보**: corpus.korean.go.kr에서 의미 분석 데이터 신청

### Phase 4: 하이브리드 시스템 (목표)

```
입력 텍스트
  → 형태소 분석 (Kiwi)
  → 한자어 후보 조회
     → 후보 1개: 사전 룩업 (빠름, 100% 정확)
     → 후보 N개: 경량 WSD 모델 (GlossBERT 또는 fine-tuned)
     → 후보 0개: 변환 없음
  → 신뢰도 기반 출력 (낮으면 변환 안함)
```

---

## 7. 핵심 참고 자료

### 논문
- Huang et al. (2019): "GlossBERT: BERT for WSD with Gloss Knowledge"
- Blevins & Zettlemoyer (2020): "BEM: Bi-Encoder Model for WSD"
- Sun et al. (ACL 2021): "ChineseBERT: Glyph and Pinyin Enhanced BERT"
- Park et al. (NeurIPS 2021): "KLUE: Korean Language Understanding Evaluation"
- Wang et al. (2023): "Self-Instruct: Aligning LM with Self-Generated Instructions"

### 오픈소스
- Google Mozc (github.com/google/mozc) — 일본어 IME 래티스 구조
- EWISER (github.com/SapienzaNLP/ewiser) — 영어 WSD
- BEM (github.com/facebookresearch/wsd-biencoders) — Bi-encoder WSD
- KLUE (github.com/KLUE-benchmark/KLUE) — 한국어 NLU 벤치마크

### 데이터
- 모두의 말뭉치 (corpus.korean.go.kr) — 의미 분석 데이터
- KorLex (KAIST) — Korean WordNet
- 세종 의미 태깅 말뭉치 — 국립국어원
