# WSD (동음이의어 판별) 파이프라인 기술문서

## 1. 개요

한자한자 서비스의 핵심 기능인 "한글 → 한자 자동 변환"에서, 동일한 한글 단어가 여러 한자에 매핑되는 동음이의어 문제를 해결하기 위한 WSD(Word Sense Disambiguation) 모델 학습 파이프라인.

**목표**: 문맥을 기반으로 동음이의어의 정확한 한자를 자동 선택하는 경량 AI 모델 구축

## 2. 동음이의어 현황

한자한자 사전 데이터(589,822개 한자어) 기준:

| 항목 | 수치 |
|------|------|
| 전체 동음이의어 | 76,188개 (2개+ 한자 매핑, 2글자 이상) |
| 2개 한자 매핑 | 50,194개 |
| 3~5개 한자 매핑 | 20,622개 |
| 6개+ 한자 매핑 | 5,580개 |
| 최다 동음이의어 | 조사(42개), 전사(41개), 사전(40개), 고사(40개) |

**소스**: `scripts/data/hanja-words-extracted.csv` (우리말샘 + 표준국어대사전 XML 파싱)

## 3. 데이터 수집

### 3.1 학습 코퍼스

| 항목 | 내용 |
|------|------|
| **데이터명** | AI Hub "한국어 성능이 개선된 초거대AI 언어모델 개발 및 데이터" |
| **출처** | [AI Hub](https://aihub.or.kr/) (회원가입 후 다운로드) |
| **원본 크기** | 17GB (tar.gz) |
| **해제 후 크기** | 16GB |
| **파일 구성** | 370개 JSON 파일 (구어체 SL01-14 + 문어체 WL01-12) |
| **JSON 구조** | `data_info[].contents` 필드에 한국어 텍스트 |
| **저장 위치** | `jinserver:/home/jinwoo/corpus/extracted/Training/01.Raw/` |

### 3.2 동음이의어 포함 문장 추출

| 항목 | 내용 |
|------|------|
| **스크립트** | `scripts/wsd/extract_homonym_sentences.py` |
| **알고리즘** | Aho-Corasick 다중 패턴 매칭 (O(n)) |
| **라이브러리** | `ahocorasick_rs` (Rust 기반 Python 바인딩) |
| **입력** | 370개 코퍼스 JSON + hanja-words-extracted.csv (76,188개 동음이의어) |
| **출력** | `homonym_sentences.jsonl` — 500,000문장, 115MB |
| **출력 형식** | `{"sentence": "...", "homonyms": ["경제", "사회"], "source": "파일명.json"}` |
| **필터 조건** | 문장 길이 10~500자, 동음이의어 1개 이상 포함 |
| **저장 위치** | `jinserver:/home/jinwoo/wsd-data/homonym_sentences.jsonl` |

**성능**: 1차 시도 O(n×m) brute force 실패 → Aho-Corasick O(n) 적용으로 수초 만에 50만 문장 추출

### 3.3 ETRI WiseNLU API 자동 라벨링

| 항목 | 내용 |
|------|------|
| **스크립트** | `scripts/wsd/label_with_etri.py` |
| **API** | ETRI 언어 분석 기술 (WiseNLU) |
| **API 엔드포인트** | `POST http://epretx.etri.re.kr:8000/api/WiseNLU` |
| **API 문서** | [공공데이터포털](https://www.data.go.kr/data/15117596/openapi.do) |
| **분석 코드** | `ner` (WSD + NER 동시 획득) |
| **API 제한** | 5,000건/일, 1만 글자/회 |
| **안전 설정** | 4,500건/일, 3,000자/회 (한글 UTF-8 3바이트 고려) |
| **Rate Limit** | 0.3초/건 |
| **배치 처리** | 문장들을 줄바꿈으로 합쳐서 3,000자 단위 배치 |
| **Resume 지원** | `.progress.json` 파일로 중단/재시작 |

**API 요청 형식**:
```json
{
  "argument": {
    "analysis_code": "ner",
    "text": "문장1\n문장2\n문장3"
  }
}
```
**헤더**: `Authorization: {API_KEY}`, `Content-Type: application/json; charset=UTF-8`

**API 응답에서 추출하는 데이터**:

| 필드 | 설명 | 예시 |
|------|------|------|
| WSD.word | 분석 대상 단어 | "경제" |
| WSD.scode | 의미 번호 (국어사전 기준) | "01", "02" |
| WSD.type | 품사 태그 | "NNG" (일반명사) |
| NE.word | 개체명 | "서울" |
| NE.type | 개체명 유형 | "LC_OTHERS" (지역명) |

**라벨링 결과** (9,047배치 중 4,500 완료 시점):

| 항목 | 수치 |
|------|------|
| WSD 라벨 | 6,663,729개 |
| NER 라벨 | 399,627개 |
| 고유 scode 수 | 52개 |
| 배치 처리 | 4,500 / 9,047 (49.7%) |

**출력**: `jinserver:/home/jinwoo/wsd-data/labeled_data.jsonl`

**출력 형식**:
```json
{
  "batch_idx": 0,
  "sentences": ["문장1", "문장2"],
  "wsd": [{"word": "경제", "scode": "01", "type": "NNG", "begin": 0, "end": 0, "sentence": "문장1"}],
  "ner": [{"word": "서울", "type": "LC_OTHERS", "begin": 3, "end": 3, "sentence": "문장1"}]
}
```

## 4. 학습 데이터셋 구축

| 항목 | 내용 |
|------|------|
| **스크립트** | `scripts/wsd/build_dataset.py` |
| **입력** | `labeled_data.jsonl` + `hanja-words-extracted.csv` |
| **필터 조건** | 2개+ scode를 가진 동음이의어, 의미당 5개+ 샘플 |

**데이터셋 규모** (4,500배치 기준):

| 항목 | 수치 |
|------|------|
| 유효 동음이의어 | 725개 |
| 최대 의미 수 | 5 |
| Train | 202,800 샘플 |
| Validation | 24,972 샘플 |
| Test | 24,972 샘플 |
| 총계 | 252,744 샘플 |

**학습 데이터 형식**:
```json
{
  "sentence": "경제 성장률이 둔화되었다.",
  "word": "경제",
  "scode": "01",
  "label": 0,
  "num_senses": 2
}
```

**저장 위치**: `jinserver:/home/jinwoo/wsd-data/dataset/`
- `train.jsonl`, `val.jsonl`, `test.jsonl`
- `label_map.json` — 단어별 scode→label_id 매핑
- `stats.json` — 데이터셋 통계

## 5. 모델 학습

| 항목 | 내용 |
|------|------|
| **스크립트** | `scripts/wsd/train_wsd.py` |
| **베이스 모델** | [beomi/kcbert-base](https://huggingface.co/beomi/kcbert-base) (한국어 BERT, 110M 파라미터) |
| **태스크** | 문장 분류 — `[CLS] 문장 [SEP] 타겟단어 [SEP]` → scode 예측 |
| **모델 구조** | KcBERT 인코더 (공유) + 단어별 분류 헤드 (725개 Linear) |
| **하이퍼파라미터** | epochs=5, batch=32, lr=2e-5, max_len=128, warmup=10% |
| **학습 하드웨어** | jinserver RTX 3080 10GB VRAM |
| **예상 VRAM** | ~5.9GB |

**학습 환경** (`jinserver:/home/jinwoo/wsd-env/`):

| 패키지 | 버전 |
|--------|------|
| Python | 3.12 |
| PyTorch | 2.10+cu126 |
| Transformers | 5.2 |
| CUDA | 12.6 |
| GPU | NVIDIA RTX 3080 (10GB VRAM) |

## 6. ONNX 변환 및 경량화

| 항목 | 내용 |
|------|------|
| **스크립트** | `scripts/wsd/export_onnx.py` |
| **변환 대상** | KcBERT 인코더 → `wsd_encoder.onnx` |
| **양자화** | INT8 동적 양자화 → `wsd_encoder_int8.onnx` |
| **헤드 분리** | 단어별 분류 가중치 → `wsd_heads.json` (JSON, JS에서 행렬곱) |
| **토크나이저** | HuggingFace tokenizer → `tokenizer/` 디렉토리 |
| **목표 크기** | 인코더 ~25MB (INT8) + 헤드 ~1MB |

## 7. 크롬 확장 통합 (예정)

**추론 파이프라인**:
1. 페이지 텍스트에서 동음이의어 단어 감지
2. ONNX Runtime Web으로 KcBERT 인코더 실행 → [CLS] 벡터
3. `wsd_heads.json`에서 해당 단어 헤드 로드 → 행렬곱 → scode 예측
4. scode → 한자 매핑 테이블로 최종 한자 결정

**목표 성능**: <500ms/페이지 (로컬 추론)

## 8. 파일 위치 요약

### 스크립트 (프로젝트 내)

| 파일 | 역할 |
|------|------|
| `scripts/wsd/extract_homonym_sentences.py` | 코퍼스에서 동음이의어 문장 추출 |
| `scripts/wsd/label_with_etri.py` | ETRI API로 WSD+NER 라벨링 |
| `scripts/wsd/build_dataset.py` | 학습 데이터셋 구축 (train/val/test) |
| `scripts/wsd/train_wsd.py` | KcBERT WSD 파인튜닝 |
| `scripts/wsd/export_onnx.py` | ONNX 변환 + INT8 양자화 |

### 데이터 (jinserver)

| 경로 | 내용 | 크기 |
|------|------|------|
| `/home/jinwoo/corpus/extracted/` | AI Hub 코퍼스 JSON | 16GB |
| `/home/jinwoo/wsd-data/homonym_sentences.jsonl` | 동음이의어 문장 50만개 | 115MB |
| `/home/jinwoo/wsd-data/labeled_data.jsonl` | ETRI WSD+NER 라벨 | ~300MB (완료 시) |
| `/home/jinwoo/wsd-data/hanja-words-extracted.csv` | 동음이의어 매핑 CSV | 50MB |
| `/home/jinwoo/wsd-data/dataset/` | 학습 데이터셋 (JSONL) | ~80MB |
| `/home/jinwoo/wsd-data/model/` | 학습된 모델 체크포인트 | ~500MB |
| `/home/jinwoo/wsd-env/` | Python ML 가상환경 | ~8GB |

### 서버 정보

| 항목 | 내용 |
|------|------|
| 호스트 | `jinserver` (Tailscale: `100.68.25.79`) |
| CPU | Intel i5-12400 |
| RAM | 48GB |
| GPU | NVIDIA RTX 3080 (10GB VRAM) |
| OS | Ubuntu (systemd) |
| 접속 | `ssh jinwoo@100.68.25.79` |

## 9. 주요 이슈 및 해결

| 이슈 | 원인 | 해결 |
|------|------|------|
| 문장 추출 O(n×m) 너무 느림 | 76K 패턴 × 각 문장 brute force | Aho-Corasick 알고리즘 (O(n)) |
| ETRI 413 Payload Too Large | MAX_CHARS 9000자 (UTF-8 27KB) | 3000자로 축소 |
| Python stdout 버퍼링 | nohup 실행 시 로그 안 보임 | `PYTHONUNBUFFERED=1` + `python3 -u` |
| PyTorch `total_mem` 에러 | API 변경 (v2.10) | `total_memory`로 수정 |
| SSH 중 pip install 끊김 | 장시간 SSH 파이프 연결 불안정 | `nohup`으로 서버에서 직접 실행 |

## 10. 미해결 과제

1. **scode → 한자 매핑**: ETRI scode는 국어사전 의미 번호이므로, 한자 매핑 테이블 별도 구축 필요
   - 방안 A: 우리말샘 XML 데이터의 `target_code` ↔ `original_language(한자)` 연결
   - 방안 B: ETRI 동음이의어 정보 API (`WiseWWN_Homonym`)로 의미 정의 조회 후 한자 매칭
2. **ETRI 라벨링 완료**: 나머지 4,547/9,047 배치 처리 필요 (~1시간)
3. **모델 성능 평가**: 학습 완료 후 test accuracy 확인 및 단어별 정확도 분석
4. **ONNX 변환 및 크기 최적화**: 목표 25MB 이하
5. **크롬 확장 통합**: ONNX Runtime Web 로더, 추론 파이프라인, UI 연동
