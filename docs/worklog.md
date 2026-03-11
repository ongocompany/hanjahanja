# 한자한자 워크로그

## 2025-03-03

### 세션 1: 프로젝트 초기 세팅
- CLAUDE.md 생성 및 AI 페르소나(한철) 추가
- pnpm 모노레포 구조 세팅 (root, pnpm-workspace.yaml)
- **apps/web**: Next.js 15 + Tailwind CSS v4 + Supabase SSR 클라이언트 → 빌드 확인 ✅
- **apps/extension**: WXT + React 19 (popup, content, background) → 빌드 확인 ✅
- **packages/shared**: 한자/사용자 타입 정의, 급수 상수
- **scripts/**: 데이터 파이프라인 스크립트 6개 placeholder
- 배포 설정: Dockerfile, docker-compose.yml, nginx.conf
- .env.example, .gitignore, Git 초기화
- docs 정리: 기획서/계획서 → docs/ 이동
- CLAUDE.md 경량화 (130줄→42줄), 상세 내용 docs/로 분리
- 개발 환경 문서화 (docs/dev-environment.md)

**현재 상태**: 기본 세팅 완료, Git 미커밋, 다음 작업 대기 중

## 2025-03-04

### 세션 2: Supabase 스키마 생성
- `supabase/migrations/001_initial_schema.sql` 작성
  - 6개 테이블: profiles, hanja_characters, hanja_words, user_vocabulary, diagnostic_questions, diagnostic_results
  - RLS 정책: 사용자별 접근 제어 + 사전/문제 데이터는 비로그인도 읽기 허용
  - 트리거: 신규 유저 profiles 자동 생성, updated_at 자동 갱신
  - 개발계획서 대비 개선: current_level/target_level을 NUMERIC(3,1)로 변경 (준급 지원)

**현재 상태**: SQL 파일 생성 완료, 형이 Supabase Dashboard에서 실행 필요 + .env.local 설정 필요

### 세션 3: 한자 CSV 임포트 + 환경 설정
- `.env.local` 환경변수 설정 완료 (Supabase URL/키, API 키들)
- `.env.example` 업데이트 (KRDICT 제거, URIMALSAEM 추가)
- `scripts/import-characters-csv.ts` 구현 + 실행 → **hanja_characters 5,978개 임포트 완료**
- `scripts/data/hanja-words-manual.csv` 수동 큐레이션 ~500개 작성
- `scripts/build-hanja-words.ts` CSV 기반 한자어 임포트 스크립트 작성
- `scripts/supplement-with-api.ts` 국립국어원 API 호출 → 서버 timeout으로 실패
- GitHub 리모트 연결 + 8커밋 푸시 완료 (https://github.com/ongocompany/hanjahanja.git)
- `docs/dev-environment.md` NAS → GitHub으로 변경

### 세션 4: 한자어 대량 구축 (XML 파싱)
- `korean-dict-nikl` 레포 데이터 다운로드 (진 형) — opendict(우리말샘) 24 XML + stdict(표준국어대사전) 88 XML
- `scripts/parse-urimalsaem-xml.ts` 구현 (SAX 스트리밍 파서)
  - 1차: fast-xml-parser로 시도 → OOM (190만줄 XML을 통째로 메모리 로드)
  - 2차: SAX 스트리밍 파서(`sax`)로 전환 → 성공
- XML 파싱 결과: 고유 한자어 **625,640개** 추출 (opendict 506,156 + stdict 119,484)
- hanja_characters 교차 매칭 후 **589,822개** hanja_words 테이블 임포트 완료 (35,818개 급수 매칭 불가로 스킵)
- CSV 백업: `scripts/data/hanja-words-extracted.csv`
- `supabase/migrations/002_add_hanja_words_unique.sql` 작성 (unique index)
- 급수별 분포: 8급 1,355 / 준7급 3,059 / 7급 5,317 / 준6급 11,307 / 6급 13,199 / 준5급 24,414 / 5급 24,614 / 준4급 92,487 / 4급 94,999 / 준3급 134,660 / 3급 37,832 / 2급 38,371 / 준1급 13,955 / 1급 70,353 / 준특급 18,464 / 특급 5,436

**현재 상태**: hanja_words 589,822개 구축 완료! 다음: 데이터 검증 → JSON 사전 생성 → 크롬 확장 변환 엔진

### 세션 5: 급수별 JSON 사전 파일 생성
- `scripts/generate-dict-json.ts` 구현
  - 1차: Supabase에서 직접 591K행 조회 → 1000행씩 591번 요청, 10분 넘게 걸려 타임아웃
  - 2차: 로컬 CSV(`scripts/data/hanja-words-extracted.csv`) + hanja_characters(DB 6K행만) 방식으로 전환 → 수 초 만에 완료
- 동음이의어 전체 보존 (배열 구조): `"경제": [{ hanja: "經濟", ... }, { hanja: "經題", ... }]`
- `packages/shared/types/hanja.ts` 타입 업데이트: `HanjaDict = Record<string, DictEntry[]>`
- 출력: `apps/extension/public/dict/` — 16개 급수별 JSON + manifest.json
  - 총 523,017개 고유 단어 (동음이의어 포함 589,822 엔트리)
  - 동음이의어 있는 단어: 51,464개
  - 급수 매칭 불가 스킵: 35,818개
- 급수별 파일 크기: 8급 443KB ~ 준3급 60MB (총 ~250MB)
- 준2급 0개 (해당 급수에 정확히 매칭되는 한자가 없음)

**현재 상태**: JSON 사전 생성 완료! 다음: 크롬 확장 변환 엔진 (사전 로더 → 토크나이저 → DOM 변환)

### 세션 6: 크롬 확장 한자 변환 엔진 구현
- `apps/extension/lib/dictionary.ts` — 급수별 JSON 로더
  - `loadDict(userLevel)`: 사용자 급수 이상 파일들을 병렬 fetch → 머지
  - browser.runtime.getURL로 확장 내부 JSON 파일 접근
  - 캐시 지원 (같은 급수 재로드 방지)
- `apps/extension/lib/tokenizer.ts` — 최장일치 토크나이저
  - 8글자→2글자 역순 매칭, 한글만 대상 (HANGUL_REGEX)
  - 동음이의어 배열 전체 반환 (DictEntry[])
- `apps/extension/lib/converter.ts` — DOM 변환 엔진
  - TreeWalker로 텍스트 노드 수집 (SKIP_TAGS 제외: script, style, input, textarea, code, pre 등)
  - `<ruby>` 태그로 한자 변환 + `<rt>`로 한글 힌트 표시
  - MutationObserver로 동적 콘텐츠 대응
  - `data-hanjahanja` 속성으로 중복 변환 방지
  - contentEditable 요소 스킵
- `apps/extension/entrypoints/content.ts` — 오케스트레이션
  - chrome.storage에서 설정(enabled, level) 읽기
  - 사전 로드 → 페이지 변환 → MutationObserver 시작
  - storage.onChanged 리스너: 설정 변경 시 페이지 새로고침
- `apps/extension/entrypoints/popup/App.tsx` — 팝업 UI 개선
  - chrome.storage 연동 (ON/OFF 토글, 급수 선택)
  - 준급 포함 전체 급수 드롭다운 (8급~4급)
- **빌드 성공**: `pnpm --filter extension build` → 262MB (dict 파일 포함)

**현재 상태**: 변환 엔진 빌드 완료! 크롬에 로드하여 테스트 필요
- 테스트 방법: chrome://extensions → 개발자 모드 → 압축해제 로드 → `apps/extension/.output/chrome-mv3`
- 기본값: 8급, 활성화
- ⚠️ 미커밋 상태 (git commit + push 필요)

### 세션 7: 툴팁 UX + 동음이의어 개선
- **루비 텍스트 → 마우스 오버 툴팁으로 전환** (투칸 스타일)
  - `<ruby>/<rt>` 제거, `<span>` 기반 인라인 한자 + 호버 툴팁
  - 다크 테마 툴팁 (배경 #1a1a2e, 금색 한자 #ffd700)
  - CSS transition 애니메이션 (opacity + translateY 슬라이드)
  - viewport 공간 판단하여 위/아래 자동 방향 전환
- **클릭하여 한자 전환 + 선호도 학습 시스템**
  - `apps/extension/lib/preference.ts` 신규 — chrome.storage.local 기반 선택 기록
  - 툴팁 내 동음이의어 클릭 시 인라인 텍스트 즉시 교체
  - 선택 횟수(×N) 표시, 다음 방문 시 자주 선택한 한자 우선 표시
- **전체 급수 로드 + 범위 밖 dim 처리**
  - `loadDict()` 매개변수 제거 → 전 급수 항상 로드 (사용자 급수 밖 동음이의어도 표시)
  - 사용자 급수 밖 엔트리는 `hjhj-dim` (opacity 0.45)로 흐리게 표시
  - 팝업 급수 선택: 8급~4급 → **8급~특급(0)** 확장 (17단계)
- **stdict(표준국어대사전) 우선순위 정렬**
  - `DictEntry`에 `source` 필드 추가 (stdict/opendict)
  - `generate-dict-json.ts`에서 source 필드 포함하여 JSON 생성
  - 정렬 순서: 사용자 선택 횟수 > 급수 범위 내 > stdict 우선 > 급수 쉬운 순
- **데이터 품질 분석**
  - CSV 소스 분포: stdict 230,036 / opendict 395,604
  - stdict only 필터 시도 → 司法 등 일부 엔트리 source 분류 오류 발견 → 양쪽 다 사용으로 복원
  - `parse-urimalsaem-xml.ts` 소스 분류 버그 확인 (opendict 먼저 처리 → stdict 덮어쓰기 누락)
- **ETRI 동음이의어 API 조사** (epretx.etri.re.kr)
  - POST `/api/WiseWWN_Homonym`, 5000회/일, API 키 필요
  - 향후 데이터 파이프라인에서 동음이의어(~13,436개) 우선순위 사전 랭킹에 활용 예정

**변경 파일**:
- `apps/extension/lib/converter.ts` — 전면 재작성 (ruby→tooltip, 클릭전환, 선호도, 애니메이션)
- `apps/extension/lib/preference.ts` — 신규 (사용자 한자 선호도 저장)
- `apps/extension/lib/dictionary.ts` — source 필드 추가, 급수 필터 제거
- `apps/extension/entrypoints/content.ts` — async convertPage, userLevel 분리 전달
- `apps/extension/entrypoints/popup/App.tsx` — 전체 급수 옵션 확장
- `scripts/generate-dict-json.ts` — source 필드 포함, stdict 우선 정렬

**현재 상태**: 툴팁 UX 완성, stdict 우선순위 적용, 빌드 완료 & 테스트 중. ✅ 커밋 완료

### 세션 8: WSD 동음이의어 판별 모델 파이프라인 설계
- **ETRI 공공데이터포털 API 조사**
  - [언어 분석 기술 API](https://www.data.go.kr/data/15117596/openapi.do) — `POST /api/WiseNLU` (분석코드 `wsd`=동음이의어, 1만 글자/회, 5,000건/일)
  - [동음이의어 정보 API](https://www.data.go.kr/data/15144927/openapi.do) — `POST /api/WiseWWN_Homonym` (단어별 동음이의어 목록)
  - 실시간 사용 불가 판단 (5,000건/일 서버 전체 한도 → 만 명이면 0.5건/일)
- **WSD 모델 자체 학습 방향 결정**
  - jinserver 사양 확인: i5-12400, 48GB RAM, **RTX 3080 10GB**, CUDA 13.0 → 충분
  - KcBERT/KoBERT 파인튜닝 가능 (VRAM 4~6GB, batch 16~32)
  - ONNX 변환 → ONNX Runtime Web으로 브라우저 로컬 추론
- **동음이의어 현황 재확인**
  - 전체 동음이의어: 76,396개 (2개: 50,194 / 3~5개: 20,622 / 6개+: 5,580)
  - 최다 동음이의어: 조사(42), 전사(41), 사전(40), 고사(40)
- **WSD 파이프라인 4단계 설계** → `docs/checklist.md` Week 2.5에 반영
  1. 학습 데이터 수집: 뉴스 코퍼스 + ETRI `wsd` API 자동 라벨링
  2. 모델 학습: KcBERT 파인튜닝 (jinserver RTX 3080)
  3. 경량화: ONNX 변환 + INT8 양자화 (목표 5~20MB)
  4. 크롬 확장 통합: ONNX Runtime Web 로컬 추론 (목표 <500ms/페이지)

**현재 상태**: WSD 파이프라인 설계 완료. 다음: ETRI API 키 발급 → 학습 데이터 수집

### 세션 9: 툴팁 개선 + WSD 학습 데이터 수집 시작

#### 툴팁 렌더링 개선 (미완료 — 나중에 디버깅 필요)
- `converter.ts` 툴팁을 `position: absolute` → `position: fixed` + `document.body`에 append 방식으로 전환
  - iframe/overflow:hidden 컨테이너에 가려지는 문제 해결 의도
  - viewport 경계 계산 (위/아래 자동 전환, 좌우 클램핑)
  - 스크롤/리사이즈 시 자동 숨김, 단일 활성 툴팁 관리
- 툴팁 박스 고정 너비 320px, max-height 360px, 자동 줄바꿈 (`word-break: keep-all`)
- 라이트 모드 기본 (흰 배경 `#fff`, 어두운 텍스트 `#333`, 금색 한자 `#b8860b`)
- 다크 모드 옵션 추가 (`.hjhj-dark`, popup에서 체크박스로 전환)
- ⚠️ **빌드는 성공하나 실제 동작 확인 안됨** — 추후 디버깅 필요

#### AI Hub 코퍼스 처리
- 진 형이 AI Hub "한국어 성능이 개선된 초거대AI 언어모델 개발 및 데이터" 17GB tar 다운로드 → Samba로 jinserver 전송
- 압축 해제: 16GB, 370개 JSON 파일 (구어체 SL01-14 + 문어체 WL01-12)
- JSON 구조: `data_info[].contents` 필드에 한국어 텍스트

#### 동음이의어 포함 문장 추출 (`scripts/wsd/extract_homonym_sentences.py`)
- 1차 시도: 76K 동음이의어 × 각 문장 brute force → O(n*m) 너무 느림
- 2차: **Aho-Corasick 알고리즘** (`ahocorasick_rs`) → O(n) 다중 패턴 매칭, 수초만에 완료
- 결과: **500,000개 문장** 추출 (115MB) → `/home/jinwoo/wsd-data/homonym_sentences.jsonl`

#### Python ML 환경 (jinserver)
- `/home/jinwoo/wsd-env/` venv 생성 (Python 3.12)
- PyTorch 2.10+cu126, Transformers 5.2, datasets, accelerate, ONNX, onnxruntime 설치
- GPU 확인: RTX 3080, 9.6GB VRAM, CUDA 사용 가능 ✅

#### ETRI WiseNLU API 자동 라벨링 (`scripts/wsd/label_with_etri.py`)
- 배치 처리 (MAX_CHARS_PER_CALL=3000), resume 지원, progress 추적
- 분석코드 `ner`로 WSD(scode) + NER(PS_NAME 등) 동시 획득
- 일일 한도 4,500건, 0.3초 rate limit
- 413 Payload Too Large 에러 → MAX_CHARS를 9000→3000으로 축소
- Python stdout 버퍼링 → `PYTHONUNBUFFERED=1` + `python3 -u`로 해결
- **백그라운드 실행 중** (PID 96062): 9,047배치 중 79완료 시점에 세션 종료
  - 세션 종료 시 WSD 73,691개, NER 4,374개 라벨 수집 중
  - 내일 `--resume`으로 이어서 실행 (약 2일 소요 예상)

**변경 파일**:
- `apps/extension/lib/converter.ts` — 툴팁 fixed 포지셔닝 + 라이트/다크 모드
- `apps/extension/entrypoints/content.ts` — darkTooltip 설정 추가
- `apps/extension/entrypoints/popup/App.tsx` — 다크 모드 체크박스
- `scripts/wsd/extract_homonym_sentences.py` — 신규 (Aho-Corasick 동음이의어 문장 추출)
- `scripts/wsd/label_with_etri.py` — 신규 (ETRI API WSD+NER 자동 라벨링)

**현재 상태**: ETRI 라벨링 jinserver에서 백그라운드 실행 중. 다음: 라벨링 완료 확인 → 학습 데이터셋 구축 → KcBERT 파인튜닝

## 2025-03-05

### 세션 10: WSD 모델 학습 + 기술문서 정리

#### ETRI 라벨링 재시작
- 어제 일일 한도(4,500건)로 4,500/9,047 배치에서 자동 중단됨
- `--resume`으로 재시작 → 현재 6,050/9,047 (66.9%) 진행 중
- 오늘 안에 완료 예상

#### 학습 데이터셋 구축
- ETRI WSD 라벨에서 동음이의어 교차 매칭 분석
  - 매칭 단어: 15,727개 (94만 건)
  - 2개+ scode(다의어): 2,511개
- `scripts/wsd/build_dataset.py` 구현
  - 필터: 2개+ 의미, 의미당 5개+ 샘플 → **725개 동음이의어**
  - Train 202,800 / Val 24,972 / Test 24,972 (총 252,744 샘플)

#### KcBERT WSD 파인튜닝
- `scripts/wsd/train_wsd.py` 구현
  - beomi/kcbert-base + 725개 단어별 분류 헤드
  - 입력: `[CLS] 문장 [SEP] 타겟단어 [SEP]` → scode 예측
- jinserver에서 학습 실행 중 (RTX 3080, VRAM 5.9GB)
  - **Epoch 1/5: train_acc=89.8%, val_acc=93.4%** ← 첫 epoch부터 좋은 성능
  - 5 epoch 완료까지 약 1시간 예상

#### ONNX 변환 스크립트
- `scripts/wsd/export_onnx.py` 작성
  - 인코더 ONNX 변환 + INT8 양자화
  - 분류 헤드 JSON 분리 (JS에서 행렬곱)

#### 기술문서 정리
- `docs/reference/wsd-pipeline.md` 작성
  - 전체 파이프라인 문서화 (출처, API, 데이터 크기, 산출물 등)

#### 이슈
- GitHub 계정 suspended → push 실패 (커밋은 로컬에 보존)
- 미해결: ETRI scode → 한자 매핑 테이블 구축 필요

**변경 파일**:
- `scripts/wsd/build_dataset.py` — 신규 (학습 데이터셋 구축)
- `scripts/wsd/train_wsd.py` — 신규 (KcBERT WSD 파인튜닝)
- `scripts/wsd/export_onnx.py` — 신규 (ONNX 변환)
- `docs/reference/wsd-pipeline.md` — 신규 (기술문서)

**현재 상태**: 모델 학습 완료 (test_acc 94.44%), ONNX 변환 완료, ETRI 라벨링 96.8%. GitHub push 완료

### 세션 11: ONNX 변환 + ETRI 라벨링 완료 확인

#### hash 버그 수정 재학습 결과
- hashlib.md5 결정적 해시로 수정 후 재학습 완료
- **Test accuracy: 94.44%** (val_acc 94.31%, Epoch 4 best)
- 이전 학습(94.45%)과 거의 동일한 성능 확인

#### ONNX 변환 완료
- `onnxscript` 의존성 추가 설치 (PyTorch 2.10 요구)
- 산출물:
  - `wsd_encoder.onnx` + `.data`: 416MB (FP32 원본)
  - `wsd_encoder_int8.onnx`: **105MB** (INT8 양자화)
  - `wsd_heads.json`: 27MB (725 단어 분류 헤드)
  - `tokenizer/`: HuggingFace 토크나이저
- CPU 추론 검증: **18~20ms/단어** (ONNX Runtime)
- INT8 모델 105MB는 목표(25MB) 초과 → 추가 경량화 필요

#### ETRI 라벨링 완료
- **8,759 / 9,047 배치** 처리 (96.8%)
- WSD 라벨: 6,377,076개 / NER 라벨: 425,510개

#### 이슈
- Tailscale SSH 인증 만료 → 재인증 후 해결
- ONNX INT8 105MB: 크롬 확장 목표(25MB) 초과, 추가 경량화 검토 필요

**변경 파일**:
- `docs/checklist.md` — ONNX 변환 완료, ETRI 라벨링 완료 반영
- `docs/worklog.md` — 세션 11 기록

**현재 상태**: WSD 모델 학습+ONNX 변환 완료, 다음 단계는 ONNX 경량화 또는 크롬 확장 통합

## 2026-03-07

### 세션 12: WSD 품질 문제 진단 + 빈도 기반 안전장치 구현

#### 문제 발견
- "의원" → "蟻援"(개미 원조) 변환 발생 — 출시 차단 이슈
- 형이 직접 테스트에서 발견: "신동욱 蟻援" 같은 황당한 변환

#### 근본 원인 분석
- **훈련 데이터 라벨링 오류**: 의원 scode 05(蟻援)에 93개 샘플 존재
  - 93개 전부 "국회의원", "하원 의원" 등 議員 문맥인데 蟻援으로 잘못 라벨링
  - 이로 인해 모델이 **confidence 0.99**로 蟻援을 예측 (높은 확신으로 틀림)
- scode_hanja_map에 99,702개 scode 중 대다수가 고어/미사용 한자
- 훈련 데이터 총 1,068,432 샘플, 9,868 단어

#### 해결: API 서버 빈도 기반 안전장치 (api_server.py v2)
- `homonym-freq.json` (23,125 단어) 빈도 데이터를 API 서버에 로드
- **강제 오버라이드**: 예측된 한자 빈도가 극히 낮고(≤5) 대안 빈도가 10배 이상이면, confidence와 무관하게 최빈 한자로 교체
  - 예: 蟻援(freq=3) → 議員(freq=7402) 강제 교체
- **약한 오버라이드**: confidence < 0.7이고 빈도 비율 < 10%이면 교체
- 기존 v1 백업 보존: `api_server_v1_backup.py`

#### 테스트 결과 (전부 정확)
| 입력 | 예측 | 상태 |
|------|------|------|
| 나경원 의원 | 議員 | ✅ (안전장치 발동) |
| 신동욱 의원 | 議員 | ✅ |
| 민주당 의원 반박 | 議員, 反駁 | ✅ (안전장치 발동) |
| 동네 의원 (의료) | 醫員 | ✅ |
| 부부 | 夫婦 | ✅ |
| 경제 | 經濟 | ✅ |
| 지진 | 地震 | ✅ |
| 사기(범죄) | 詐欺 | ✅ |
| 사기(군대) | 士氣 | ✅ |

#### 서버 파일 변경 (jinserver:/home/jinwoo/wsd-data/)
- `api_server.py` — v2 (빈도 안전장치 추가)
- `api_server_v1_backup.py` — v1 백업
- `onnx/homonym_freq.json` — 빈도 데이터 (확장에서 복사)

**현재 상태**: WSD 품질 핵심 문제 해결, API 서버 배포 완료. 재학습 없이 빈도 기반 안전장치로 해결.

### 세션 13: WSD 변환 품질 개선 + 대규모 테스트 + 모델 교체 준비

#### 변환 품질 개선
- 고유어 블록리스트 추가: 사내, 재미, 나중, 사랑 (순우리말 오변환 방지)
- 급수 기반 정렬 제거: `sortByPreference()`에서 level 비교 삭제 (형 요청 — "레벨이 높은데 오히려 더 자주쓰이는 한자가많아")
- 합성어→合成魚 버그 수정: 빈도 동일(3:3) + 비결정적 dict 로딩 순서 + 급수 tiebreaker가 원인
- 통사 블록리스트 추가: WSD 미지원 동음이의어 카테고리 신설 (7개 동음이의어, WSD 헤드 없음)
- 커밋: `25836ea`, `81212f9`

#### 대규모 WSD 정확도 테스트
- **수동 테스트 (102케이스)**: 73.5% 정확도 (문맥 무시 패턴 다수 발견)
- **전체 WSD 헤드 테스트 (7,587단어)**: 중립 문장 5개씩 테스트
  - 항상 같은 답: 7,109개 (93.7%) → **실질적으로 빈도 룩업과 동일**
  - 문맥 따라 다름: 478개 (6.3%) → WSD가 실제 작동하는 단어
- **오답 분석 (3,759단어)**: 모델 답 ≠ 빈도 1위(2,339개) + 빈도 유사(2,878개) 합집합
  - 일상 빈출 단어 다수 포함: 관리, 사회, 시장, 인상, 인도, 보석
- 코퍼스 오염 발견: 직시→直時(북한어, freq=7) — 북한 문학 포함 코퍼스

#### WSD 국제 사례 조사
- 일본어 IME (Mozc 등): 사전→N-gram→사용자적응→신경망 순 발전, 핵심은 **하이브리드 구조**
- 중국어 Pinyin→Hanzi: 우리 문제와 구조적으로 동일, Lattice+Viterbi 탐색
- ChineseBERT (ACL 2021): 글자 모양+발음을 임베딩에 추가 → 동음이의어 해소 향상
- GlossBERT: 사전 정의 매칭으로 라벨 데이터 없이 WSD 가능 — **가장 유망한 단기 해결책**
- 합성 데이터: LLM-as-Annotator 패턴, Hard Negative Mining, 비용 $100-150 예상
- 보고서: `docs/reference/WSD-국제연구조사.md`

#### WSD 모델 KLUE-RoBERTa 교체 준비
- KcBERT(댓글 도메인) → KLUE-RoBERTa(다양한 62GB 코퍼스)로 교체 결정
- 수정 파일:
  - `scripts/wsd/train_wsd.py` — RoBERTa token_type_ids 미사용 대응, 기본값 klue/roberta-base
  - `scripts/wsd/export_onnx.py` — ONNX 변환 시 token_type_ids 분기
  - `scripts/wsd/api_server.py` — 토크나이저 교체 + ONNX 입력 자동 감지
- 신규 파일:
  - `scripts/wsd/generate_synthetic_data.py` — Gemini 2.5 Flash로 합성 데이터 생성 (드라이런/전체 실행/resume 지원)
  - `docs/reference/WSD-국제연구조사.md` — 일본/중국/한국/합성데이터 조사 보고서

**변경 파일**:
- `apps/extension/lib/converter.ts` — 블록리스트 추가, 급수정렬 제거
- `scripts/wsd/train_wsd.py` — KLUE-RoBERTa 호환
- `scripts/wsd/export_onnx.py` — KLUE-RoBERTa 호환
- `scripts/wsd/api_server.py` — 토크나이저 교체
- `scripts/wsd/generate_synthetic_data.py` — 신규 (Gemini 합성 데이터)
- `docs/reference/WSD-국제연구조사.md` — 신규 (조사 보고서)
- `docs/reference/LLM모델을활용한동음이의어학습데이터생성계획` — 형이 작성 (Gemini 대화)

**현재 상태**: KLUE-RoBERTa 교체 코드 준비 완료, jinserver에서 학습 실행 필요. 합성 데이터 생성 스크립트 준비 완료.

### 세션 14: KLUE-RoBERTa 학습 + ONNX 변환 + API 서버 교체

#### KLUE-RoBERTa 학습 완료
- jinserver에서 SSH로 직접 학습 실행 (RTX 3080, ~10분/epoch)
- **결과 비교:**

| 모델 | Best Val Acc | Test Acc |
|------|------------|----------|
| beomi/kcbert-base | 94.31% | 94.44% |
| klue/roberta-base | **94.68%** | **94.81%** |
| **차이** | **+0.37%p** | **+0.37%p** |

- Epoch 4에서 best model 저장 (val_acc=94.68%)

#### ONNX 변환 + 배포
- `export_onnx.py` 실행 → onnx-klue/ 산출물 생성
  - wsd_encoder.onnx + .data: 420MB (FP32)
  - wsd_encoder_int8.onnx: 107MB (INT8)
  - wsd_heads.json: 26MB (이전 649MB → 26MB로 대폭 축소)
- onnx/ 프로덕션 디렉토리에 복사 → API 서버 재시작
- API 서버: klue/roberta-base 토크나이저 + token_type_ids 미사용 자동 감지 확인

#### 정확도 테스트
- 수동 테스트 16케이스: 11/16 = 68.8%
  - ✅ 자신/自身, 소재/素材, 인상(2개), 선정, 전선/電線, 중심, 방어, 자원(2개), 자체
  - ❌ 자신감→自信 미인식(自身 편향), 소재→所在 미인식, 지점→支店 미인식, 전선→前線 vs 戰線 혼동
- **분석**: 모델 교체만으로는 +0.37%p 개선에 그침. 소수 의미 편향 문제는 합성 데이터 추가가 필요

**현재 상태**: KLUE-RoBERTa 배포 완료. 다음 단계는 Gemini 합성 데이터 생성 드라이런.

### 세션 15: WSD 합성 데이터 대량 생성

#### 목표
- 소수 의미(minority sense) 편향 해소를 위한 합성 학습 데이터 생성
- 대상: 2,237개 동음이의어 중 학습 데이터 불균형 단어
- 생성 기준: c < 10 → 30문장, c 10-29 → 20문장, c 30-99 → 10문장, c ≥ 100 → SKIP

#### 타겟 단어 추출 (jinserver 데이터 기반)
- `dataset_v4/label_map.json` (단어→scode→label 매핑)
- `onnx/wsd_scode_hanja_map.json` (scode→한자 매핑)
- `scode_definitions.json` (114만 뜻풀이)
- `dataset_v4/train.jsonl` (학습 데이터 빈도 카운트)
- 필터: train_count > 0 + distinct_hanja ≥ 2 → **2,237개 단어**
- 불균형 분포: 극심(50:1+) 288개, 심함(10:1~50:1) 548개, 중간(3:1~10:1) 1,401개

#### Claude 에이전트 생성 (Round 1~4)
- Gemini API 쿼터 제한으로 방향 전환 → Claude 에이전트 직접 생성
- 배치 크기 최적화: 20단어(토큰 초과) → 10단어(간헐적 초과) → **5단어(안정)**
- 10개 에이전트 병렬 실행 × 4라운드
- **결과: 238단어 완료, 15,707 문장 생성**
- 출력 위치: `/tmp/wsd_synthetic/` (output_*.jsonl, r2~r4/)
- ⚠️ Claude 토큰 소모량이 과다 → 4시간 사용 리밋 발생

#### Gemini 자동 생성 스크립트 (나머지 1,999단어)
- flash-lite deprecated → **gemini-2.5-flash-lite** 사용
- `generate_gemini.py` 작성 → jinserver 배포
- 테스트 실행: 2배치(10단어) → 366문장 정상 생성
- **nohup 백그라운드 실행 중** (PID 288081, 400배치, 약 13시간 예상)
- 서버 경로: `~/wsd-data/synthetic/`
- 진행 확인: `ls ~/wsd-data/synthetic/gemini_output/ | wc -l`

#### 서버 파일 변경 (jinserver:/home/jinwoo/wsd-data/synthetic/)
- `generate_gemini.py` — 신규 (Gemini 배치 생성 스크립트)
- `gemini_batches.json` — 400배치 × 5단어 입력 데이터
- `gemini_output/batch_XXXX.jsonl` — 출력 (생성 중)

#### 로컬 파일 (/tmp/wsd_synthetic/)
- `output_*.jsonl` — R1 (20단어/배치, 5,944줄)
- `r2/output_*.jsonl` — R2 (10단어/배치, 4,668줄)
- `r3/output_*.jsonl` — R3 (5단어/배치, 2,284줄)
- `r4/output_*.jsonl` — R4 (5단어/배치, 2,811줄)
- `wsd_targets.json` — 전체 2,237개 타겟 단어 데이터
- `gemini_batches.json` — 남은 1,999단어 배치 입력

**현재 상태**: Gemini 생성 jinserver에서 백그라운드 실행 중. 완료 후 → 로컬 Claude 결과와 병합 → train.jsonl에 추가 → 재학습

### 세션 16: 웹 서비스 개선 (가입/로그인/테스트)

#### 회원가입 + 로그인 구현
- `apps/web/lib/supabase/middleware.ts` — Supabase 세션 쿠키 갱신 유틸
- `apps/web/middleware.ts` — 모든 요청에서 세션 갱신
- `apps/web/lib/auth/actions.ts` — signup, login, logout 서버 액션
- `apps/web/app/auth/callback/route.ts` — 이메일 확인 콜백
- `apps/web/app/signup/page.tsx` — 회원가입 폼 (닉네임/이메일/비밀번호)
- `apps/web/app/login/page.tsx` — 로그인 폼
- `apps/web/components/landing/logout-button.tsx` — 로그아웃 버튼 (클라이언트 컴포넌트)

#### 비밀번호 규칙 강화
- 10자 이상, 대문자 1개+, 소문자 1개+, 특수문자 1개+
- 클라이언트 유효성 검사 + 힌트 텍스트

#### 이용약관/동의 체크박스
- 이용약관, 개인정보 수집·이용 동의, 제3자 정보제공 동의
- 전체동의 체크박스 + 개별 토글 + 보기/접기 내용

#### 네비바 개선
- 로그인 링크 추가 (비로그인: 로그인 + 회원가입 버튼)
- 로그인 상태: 이메일 표시 + 로그아웃 버튼

#### 개발 서버 환경 구성
- 개발 포트 3500번으로 변경 (`-p 3500 -H 0.0.0.0`)
- jinserver에서 개발서버 운영 (SSH 직접 관리)
- `allowedDevOrigins` 호스트명만 지정 (프로토콜/포트 제거)
- `apps/web/.env.local` 심볼릭 링크 생성

#### 진단 테스트 수정
- 누락 파일 커밋 (app/test/page.tsx, lib/diagnostic.ts, components/test/, data/diagnostic-questions.json)
- "그만하기" 클릭 시 메인 페이지로 이동 (인트로 화면 제거)
- `/test` 직접 접속 시 level 파라미터 없으면 메인으로 리다이렉트

**현재 상태**: 회원가입/로그인 완성, 테스트 페이지 수정 완료. 다음: 합성 데이터 생성 완료 확인 → WSD v3 재학습

## 2026-03-08

### 세션 17: WSD 데이터 정제 + 재학습 + 확장 버그 수정

#### 확장 팝업 빈 화면 수정
- `loadSession()`에 `.catch()` 없어서 에러 시 로딩 상태 무한 대기
- `.catch()` + `.finally(() => setLoaded(true))` 추가로 해결
- `chrome.storage.local` → `browser.storage.local` (WXT 호환) 변경

#### 한 글자 단어 변환 차단
- `converter.ts`에 `m.word.length >= 2` 필터 추가
- 한 글자는 문맥 판별 어렵고 오변환 위험 높아 전면 차단

#### WSD 수동 리뷰 + 데이터 정제
- `scripts/wsd-reviewer.html` 구현 — 759개 동음이의어 리뷰 웹 UI
- 형이 321개 단어 수동 리뷰 → 불필요한 의미(고어/미사용) 제거
- 서버에서 label_map 정리: 759→561 단어 (0-1개 의미만 남은 단어 제거)
- 데이터셋 필터: train 43,908→29,616 / val 4,979→3,363 / test 4,979→3,363
- label 인덱스 재매핑 (3,969건)

#### WSD v3 모델 학습 + 배포
- beomi/kcbert-base, 5 epochs, batch=32
- **val_acc=96.25%, test_acc=95.81%** (v2 대비 +1.4%p)
- ONNX INT8 변환 (109.2MB) + wsd_heads.json (22MB, 561 단어)
- API 서버 배포 완료, 정확도 확인 (경기→京畿, 국장→局長, 지사→知事, 경선→競選)

#### 툴팁 클릭 고정 UX 수정
- `showTooltip()`에서 `hideTooltipNow()` 호출 시 `pinnedTooltip = false` 리셋 되는 버그
- 고정 상태에서 hover로 풀리지 않도록 보호 로직 추가
- 다른 단어 클릭 시 기존 고정 해제 후 새 단어 고정

**변경 파일**:
- `apps/extension/entrypoints/popup/App.tsx` — loadSession 에러 처리
- `apps/extension/lib/auth.ts` — browser.storage 변경
- `apps/extension/lib/sync.ts` — browser.storage 변경
- `apps/extension/lib/converter.ts` — 한글자 차단 + 툴팁 고정 수정
- `scripts/wsd-reviewer.html` — 신규 (리뷰 웹 UI)
- `docs/handoff-session17.md` — 신규

**현재 상태**: WSD v3 배포 완료 (95.81%), 확장 버그 수정 완료. 클로즈 베타 준비 단계 진입

### 세션 18: 소개 페이지 + OAuth 점검 + Supabase MCP 설정

#### 소개 페이지 (/about) 구현
- `apps/web/app/about/page.tsx` — 플레이스홀더 → 풀 콘텐츠 구현
- `docs/한자한자소개페이지구성안.md` 290라인~ 카피 기반, guide 페이지 톤앤매너 맞춤
- 8개 섹션: Hero, Problem, How it works(4단계), Strength(2x2 그리드), Technology, Personalization, Audience, CTA
- 캐릭터 이미지 활용 (whiteboard.svg, exhausted.svg, thinking.png, studying.png, curiosity.svg, yeah.png)
- jinserver 개발서버에 scp 전송 → 반영 확인

#### OAuth 코드 현황 점검
- **네이버**: 완전 구현 (커스텀 OAuth flow, API route + callback, env 변수 있음)
- **구글/카카오**: UI 버튼 + signInWithOAuth 코드 완성, Supabase 대시보드 프로바이더 설정만 남음
- 관련 파일: social-login-buttons.tsx, actions.ts, auth/callback/route.ts, api/auth/naver/

#### Supabase MCP 전역 설정
- `~/.claude/.mcp.json` 생성 — @supabase/mcp-server-supabase 설정
- Personal Access Token 발급 완료
- Claude Code 재시작 후 사용 가능

**변경 파일**:
- `apps/web/app/about/page.tsx` — 소개 페이지 풀 구현
- `~/.claude/.mcp.json` — 신규 (Supabase MCP 전역 설정)

**현재 상태**: 소개 페이지 완성, OAuth 코드 준비 완료. 재시작 후 Supabase MCP로 OAuth 프로바이더 설정 예정

### 세션 19: OAuth 연동 + 도메인 변경 + Supabase 동기화 + 확장 개선

#### OAuth 설정 완료
- Supabase 대시보드에서 Google, Kakao OAuth 프로바이더 수동 설정
- 도메인 hanjahanja.kr → hanjahanja.co.kr 전체 변경 (layout.tsx, CLAUDE.md, nginx.conf)

#### 웹 → 확장 로그인 동기화
- `apps/web/app/auth/extension-sync/page.tsx` — 신규. 로그인 후 세션 데이터를 DOM에 렌더링
- `apps/extension/entrypoints/extension-sync.content.ts` — 신규. sync 페이지에서 세션 읽어 background로 전달
- `apps/extension/entrypoints/background.ts` — `save-session` 메시지 리스너 추가
- `apps/web/app/login/page.tsx` — `next` 파라미터 지원 (로그인 후 리다이렉트)
- `apps/web/lib/auth/actions.ts` — `login()`, `socialLogin()`에 `next` 파라미터 전달
- `apps/web/components/auth/social-login-buttons.tsx` — `next` prop 추가
- `apps/web/app/auth/callback/route.ts` — 0.0.0.0 바인딩 문제 수정 (host 헤더 사용)
- 확장 팝업 로그인 버튼 → 웹 로그인 페이지로 이동하는 방식으로 변경

#### Supabase 노출/클릭 동기화
- `user_exposures`, `user_clicks` 테이블 생성 (003_personalization.sql)
- `apps/extension/.env` 생성 — Supabase URL/키 추가 (기존 누락으로 동기화 불가였음)
- `apps/extension/lib/tracker.ts` — flush 주기 5분→30초, `flushExposures` export
- `apps/extension/entrypoints/content.ts` — `flush-tracker` 메시지 핸들러 추가
- `apps/extension/entrypoints/popup/App.tsx` — sync 전 flush 요청, 로그인 필수로 통계 표시

#### 확장 UX 개선
- 호버 추적 추가 (mouseenter 시 trackClick, 페이지당 단어별 1회)
- 동음이의어 선택 클릭에서 trackClick 제거 (선호도만 저장)
- 툴팁 ×count 표시 제거
- `<a>` 태그 안 한자어 클릭 시 링크 동작 우선 (메뉴 전환 차단 해결)
- 단어장 저장: 한자 텍스트 선택 시 역조회 지원 (data-word 속성)
- 문맥 추출에서 CSS/코드 텍스트 필터링

#### 체크리스트 업데이트
- 마이페이지 단어장 세부 항목 추가 (목록, 삭제, 연습문제, 학습 통계)

**변경 파일**:
- `apps/extension/` — converter.ts, content.ts, background.ts, tracker.ts, popup/App.tsx, extension-sync.content.ts(신규), .env(신규)
- `apps/web/` — login/page.tsx, auth/callback/route.ts, auth/extension-sync/page.tsx(신규), lib/auth/actions.ts, components/auth/social-login-buttons.tsx, layout.tsx
- `docs/checklist.md`, `docs/worklog.md`, `CLAUDE.md`, `nginx.conf`, `.gitignore`

**현재 상태**: OAuth 동작, 웹→확장 세션 동기화 구현, Supabase 노출/클릭 동기화 완성. 마이페이지 단어장 웹 UI 미구현

## 2026-03-09

### 세션 20: 마이페이지 단어장 + 퀴즈 실데이터 전환 + 오답 재출제

#### 마이페이지 단어장 웹 UI 구현
- `apps/web/app/mypage/page.tsx` — 목데이터 → 서버 컴포넌트로 전면 리라이트
  - Supabase에서 프로필(닉네임, 급수) + 단어장 조회
  - 비로그인 시 `/login?next=/mypage`로 리다이렉트
- `apps/web/components/mypage/mypage-tabs.tsx` — 신규. 탭 전환 (단어장/설정)
- `apps/web/components/mypage/vocab-list.tsx` — 신규. 검색, 필터(전체/학습중/암기완료), 날짜별 그룹핑, 암기 토글, 삭제
- `apps/web/components/mypage/settings-panel.tsx` — 신규. 닉네임 저장, 급수 변경, 로그아웃
- `apps/web/lib/vocab/actions.ts` — 신규. 서버 액션 (getVocabulary, toggleMemorized, deleteVocab, updateProfile)
- `apps/web/app/login/page.tsx` — useSearchParams Suspense 래핑 (빌드 에러 수정)

#### 확장 → Supabase 단어장 동기화
- 기존: 확장에서 우클릭 저장 시 로컬 스토리지만 저장 → 웹 마이페이지에 안 보이는 문제
- `apps/extension/lib/sync.ts` — `syncLocalVocabulary()` 추가. 로컬 단어장 일괄 Supabase 동기화 (vocabSyncedCount 인덱스 기반)
- `apps/extension/entrypoints/background.ts` — 로컬 저장 후 `saveToVocabulary()` Supabase 동기화 추가

#### 퀴즈 목데이터 → 실데이터 전환
- 기존: MOCK_QUIZ_EXPOSURE, MOCK_QUIZ_CLICK 하드코딩 → 삭제
- `apps/extension/entrypoints/popup/App.tsx` — `generateQuizFromData()` 구현
  - 실제 노출/클릭 데이터 기반 퀴즈 생성
  - 데이터 4개 미만 시 "데이터 부족" 안내 메시지
- 팝업 단어장 링크 `/mypage/vocab` → `/mypage`로 수정 (521 에러 해결)

#### 동음이의어 뜻풀이 힌트 시스템
- 문제점: "기사의 한자는?" → article인지 knight인지 구분 불가
- 해결: 뜻풀이 기반 출제 → "다음 설명에 해당하는 한자어를 고르세요: '신문이나 책에서 사실을 기록한 글'"
- `apps/extension/lib/converter.ts` — trackExposure에 meaning 파라미터 전달
- `apps/extension/lib/tracker.ts` — meaningCache 추가. 노출 시 뜻풀이 저장, flush 시 chrome.storage에 영속화
- 팝업에서 meaningCache 로드 → 퀴즈 힌트로 활용

#### 퀴즈 정답/오답 기록 + 오답 재출제
- `supabase/migrations/004_quiz_results.sql` — user_quiz_results 테이블 생성 (RLS 적용)
- `apps/extension/lib/sync.ts` — `saveQuizResult()`, `getWrongWords()` 추가
  - saveQuizResult: 개별 정답/오답 Supabase 기록
  - getWrongWords: 최근 7일 오답 > 정답인 단어 조회
- `apps/extension/entrypoints/popup/App.tsx` — handleAnswer에서 결과 저장, 오답 단어 우선 출제

**변경 파일**:
- `apps/web/` — mypage/page.tsx, login/page.tsx, components/mypage/(신규 3개), lib/vocab/actions.ts(신규)
- `apps/extension/` — popup/App.tsx, lib/sync.ts, lib/tracker.ts, lib/converter.ts, entrypoints/background.ts
- `supabase/migrations/004_quiz_results.sql` (신규, Supabase 실행 완료)

**현재 상태**: 마이페이지 단어장 웹 UI 완성, 퀴즈 실데이터 전환, 뜻풀이 힌트, 오답 재출제 구현 완료. jinserver 빌드 배포 완료

### 세션 21: VPS 프로덕션 배포 + 크롬 웹스토어 등록

#### VPS 프로덕션 배포 (Vultr 158.247.225.152)
- Docker 대신 **pm2 + nginx** 구성으로 배포
- Next.js `output: "standalone"` 설정 추가
- **pm2 프로세스**: hanjahanja-web (포트 3100), hanjahanja-wsd (포트 8079)
- **nginx 리버스 프록시**: `/` → web, `/api/wsd` → WSD API, `/api/wsd-health` → health
- **SSL**: Let's Encrypt certbot (hanjahanja.co.kr)
- WSD API: FastAPI + ONNX Runtime (INT8 모델) jinserver → VPS 파일 전송 후 배포
- `pm2 save` + `pm2 startup` 설정 (재부팅 시 자동 복구)

#### 확장 프로덕션 URL 변경
- `apps/extension/entrypoints/background.ts` — WSD_API_URL을 `http://100.68.25.79:8079` → `https://hanjahanja.co.kr/api`로 변경
- health 엔드포인트 `/health` → `/wsd-health` (nginx 프록시 경로에 맞게)
- jinserver에서 프로덕션 빌드 → `hanjahanja-extension.zip` (73MB) 생성

#### 크롬 웹스토어 등록
- 비사업자(개인) 개발자 계정으로 등록 ($5 결제 완료)
- 확장 zip 업로드 완료, 심사 대기 중

#### SSH 환경 설정
- VPS용 SSH 키 생성 (`~/.ssh/id_ed25519_vps`)
- `~/.ssh/config`에 `vps`, `hanjahanja.co.kr` 호스트 추가 → `ssh vps`로 바로 접속 가능

**변경 파일**:
- `apps/web/next.config.ts` — standalone 출력 추가
- `apps/extension/entrypoints/background.ts` — WSD API URL 프로덕션 변경
- `docs/checklist.md` — OAuth, 마이페이지 단어장 항목 완료 처리

**현재 상태**: VPS 프로덕션 배포 완료 (hanjahanja.co.kr), 크롬 웹스토어 심사 대기 중

### 세션 22: 법적 페이지 + 전화번호 수집 + 크롬 웹스토어 제출 + VPS 배포 수정

#### 법적 페이지 생성
- `apps/web/app/privacy/page.tsx` — 개인정보처리방침 (수집항목, 목적, 보유기간, 제3자 제공, 파기, 사용자 권리)
- `apps/web/app/terms/page.tsx` — 이용약관 12조 (서비스 설명, 회원, 의무, 요금, 지적재산권 등)
- 프로젝트 디자인 톤 (cream/vanilla/warm-brown) 적용

#### 전화번호 수집 기능
- `supabase/migrations/006_add_phone_to_profiles.sql` — profiles 테이블에 phone 컬럼 추가
- `apps/web/app/auth/complete-profile/page.tsx` — 소셜로그인 후 전화번호 입력 페이지 (Suspense 래핑)
- `apps/web/app/auth/callback/route.ts` — 전화번호 미입력 시 complete-profile로 리다이렉트
- `apps/web/components/mypage/settings-panel.tsx` — 전화번호 수정 UI 추가
- `apps/web/app/signup/page.tsx` — 개인정보 동의 항목에 전화번호 추가

#### OAuth 리다이렉트 버그 수정
- **문제**: hanjahanja.co.kr에서 로그인하면 localhost로 리다이렉트됨
- **원인**: `headers().get("origin")` 방식이 프로덕션에서 빈 값 반환
- **해결**: `process.env.NEXT_PUBLIC_SITE_URL` 사용으로 전면 교체
  - `apps/web/lib/auth/actions.ts` — socialLogin() baseUrl 변경
  - `apps/web/app/auth/callback/route.ts` — origin 변경
- **Supabase Site URL**: jinserver → `https://hanjahanja.co.kr`로 변경 (대시보드)

#### 크롬 웹스토어 제출
- 등록정보 탭: 설명, 스크린샷, URL 입력
- 개인정보보호 탭: 데이터 수집 항목, 권한 사유 설명
- 배포 탭: 비공개 (클로즈 베타) 설정
- **제출 완료, 검토 대기 중**

#### VPS 배포 이슈 해결
- **이미지 400 에러**: `sharp` 패키지 VPS에 설치 (`pnpm add -w sharp`)
- **CSS/JS 404 에러**: Next.js standalone 모드에서 `.next/static`과 `public` 폴더 미포함
  - `cp -r .next/static .next/standalone/apps/web/.next/static`
  - `cp -r public .next/standalone/apps/web/public`
- **OAuth 콜백 502 에러**: Supabase JWT 쿠키가 nginx 기본 버퍼 초과
  - nginx에 `proxy_buffer_size 128k`, `proxy_buffers 4 256k` 추가
- `scripts/deploy-vps.sh` — 배포 자동화 스크립트 작성

**변경 파일**:
- `apps/web/` — privacy/page.tsx(신규), terms/page.tsx(신규), auth/complete-profile/page.tsx(신규), auth/callback/route.ts, lib/auth/actions.ts, lib/vocab/actions.ts, components/mypage/settings-panel.tsx, mypage/page.tsx, signup/page.tsx
- `supabase/migrations/006_add_phone_to_profiles.sql` (신규)
- `scripts/deploy-vps.sh` (신규)

**현재 상태**: 법적 페이지 완성, 전화번호 수집 구현, OAuth 수정, VPS 정상 배포. 크롬 웹스토어 검토 대기 중

## 2026-03-09

### 세션 23: 보안 강화 + 소셜 로그인 전용 전환 + UI 개선

#### 보안 검토 및 수정 (Critical/High)
- Open Redirect 방지: `sanitizeRedirect()` 함수 추가 (callback, actions)
- OAuth provider 화이트리스트: `ALLOWED_PROVIDERS` 배열로 제한
- 프로필 업데이트 필드 화이트리스트: `ALLOWED_PROFILE_FIELDS` 적용
- `getUser()` 서버사이드 토큰 검증으로 통일 (extension-sync)
- Naver 콜백: `listUsers` 풀스캔 → `createUser` + 중복 무시 패턴으로 변경

#### 소셜 로그인 전용 전환
- 이메일/비밀번호 가입/로그인 완전 제거 (signup → /login 리다이렉트)
- 소셜 로그인 후 프로필 완성 페이지 통합: 이름(필수) + 전화번호(선택) + 약관동의(필수)
- `completeProfile()` 서버 액션 — OAuth 메타데이터에서 avatar_url 자동 추출
- 네비바에 소셜 프로필 이미지 표시 (없으면 기본 이미지)

#### 회원 탈퇴 기능
- `deleteAccount()` 서버 액션: user_vocabulary → profiles 삭제 → auth 유저 삭제
- 확인 모달: "탈퇴합니다" 텍스트 입력 필수 (실수 방지)

#### 네비바 간소화
- 마이페이지 링크, 로그아웃 버튼 제거
- 프로필 아이콘 클릭 → /mypage 이동으로 통합

#### 로그인 유지 옵션
- 로그인 페이지에 "로그인 유지" 체크박스 추가 (기본 ON)
- 미들웨어에서 `remember_me` 쿠키 확인, 해제 시 세션 쿠키로 변환

#### Supabase 데이터 초기화
- 테스트를 위해 모든 사용자 데이터 삭제 (auth.users, profiles, user_vocabulary 등)
- profiles 테이블에 `terms_agreed_at`, `avatar_url` 컬럼 추가

**변경 파일**:
- `apps/web/lib/auth/actions.ts` — socialLogin, completeProfile, deleteAccount, logout
- `apps/web/lib/supabase/middleware.ts` — 로그인 유지 옵션 처리
- `apps/web/components/landing/nav-menu.tsx` — 간소화 (프로필 아이콘→마이페이지)
- `apps/web/components/mypage/settings-panel.tsx` — 회원 탈퇴 모달
- `apps/web/app/login/page.tsx` — 소셜 로그인 전용 + 로그인 유지
- `apps/web/app/auth/callback/route.ts` — sanitizeRedirect, terms_agreed_at 체크
- `apps/web/app/auth/complete-profile/page.tsx` — 이름+전화번호+약관 통합
- `apps/web/next.config.ts` — 소셜 프로필 이미지 도메인 추가

**커밋 히스토리**:
- `d937dc5` feat: 소셜 로그인 전용 + 약관동의/이름/전화번호 통합 + 프로필 이미지
- `86ffef3` feat: 회원 탈퇴 기능 추가 (확인 모달 + 데이터 즉시 삭제)
- `64d7169` feat: 네비바 간소화 (프로필 아이콘→마이페이지) + 로그인 유지 옵션

**현재 상태**: 소셜 로그인 전용 체계 완성, 회원 탈퇴/로그인 유지 구현, VPS 배포 완료. 다음 작업: 확장 퀴즈 탭 개선 (단어장 복습 탭 추가)

## 2026-03-11

### 세션 24: VPS 재구축 + 모바일 앱 개발 시작

#### VPS 서버 재구축
- Vultr VPS 리인스톨 (4 CPU / 8GB RAM으로 스펙 업그레이드)
- Docker 29.3.0 + Compose 5.1.0 설치
- Nginx 리버스 프록시 설정 (HTTP only, Cloudflare Flexible SSL)
- SSH 키 생성 → GitHub 배포용 등록
- 프로젝트 클론 + .env 설정 + Docker 빌드 & 배포
- hanjahanja.co.kr 정상 접속 확인 (HTTP 200)
- dev-environment.md 업데이트 (스펙, Cloudflare SSL, 프로젝트 경로 등)

#### 크롬 웹스토어 등록 완료
- 심사 통과 → 웹스토어 등록 확인

#### 모바일 앱 개발 착수 (Phase 1)
- 모바일 앱 콘셉트 결정: "한자 학습 앱 + 인앱 브라우저(WebView)"
  - 학습 탭: 단어장, 맞춤 퀴즈, 진단 테스트, 통계
  - 한자 브라우저 탭: WebView + content script 주입 (한자 자동 변환)
  - 마이페이지 탭: 기록, 설정, Anki/Quizlet 내보내기
- 기존 코드 약 85% 재활용 가능 (변환 로직, 퀴즈, 동기화 등)
- `docs/모바일앱_개발계획서.md` 작성
- `feature/mobile-app` 브랜치 생성
- React Native (Expo SDK 55) 프로젝트 초기화 (`apps/mobile/`)
- 3탭 네비게이션 구현 (학습 / 한자 브라우저 / 마이페이지)
- 기본 UI 뼈대 완성 (학습 대시보드, 브라우저 플레이스홀더, 마이페이지 메뉴)

**수정된 파일**:
- `docs/dev-environment.md` — VPS 정보 업데이트
- `docs/모바일앱_개발계획서.md` — 신규 작성
- `apps/mobile/` — Expo 프로젝트 전체 (신규)

**현재 상태**: VPS 재구축 완료, 웹스토어 등록 완료, 모바일 앱 Phase 1 진행 중. 다음 작업: Supabase Auth 연동 → Phase 2 (인앱 브라우저 WebView)
