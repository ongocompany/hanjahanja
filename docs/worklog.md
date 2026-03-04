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
