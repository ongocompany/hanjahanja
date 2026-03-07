# 한자한자 Phase 1 MVP 체크리스트

> 담당: 🧑 진 형 / 🤖 한철 / 🤝 같이
> 상태: ⬜ 미시작 / 🔄 진행중 / ✅ 완료 / ⏸️ 대기 (선행작업 필요)

---

## Week 0: 사전 준비 (진 형 중심)

### 데이터 준비 🧑
- ✅ 개별 한자 CSV 파일 정리 → `docs/reference/hanja_characters.csv` (5,978자)
- ✅ 우리말샘 오픈 API 키 발급 → `120a24d0-4598-4567-948d-653f61b460b3`
- ✅ 국립국어원 오픈 API 키 발급 → `C822A15091C0A8A2218553923DD925D7`
- ✅ korean-dict-nikl 사전 XML 데이터 다운로드 (opendict + stdict)
- ✅ ETRI 공공데이터포털 API 키 발급 (언어 분석 기술 API) 🧑

### 외부 서비스 세팅 🧑
- ✅ Supabase 프로젝트 생성 → URL, anon key, service role key 확보
- ✅ Kakao Developers 앱 생성 + REST API 키 발급
- ⏸️ Google Cloud Console OAuth 클라이언트 ID 발급 (사업자등록번호 대기)
- ⏸️ Chrome Web Store 개발자 계정 등록 (한국 주소 인증 문제, 사업자 계정으로 재시도 예정)

---

## Week 1: 기반 구축 + 데이터 파이프라인

### Day 1-2: 프로젝트 초기 설정
- ✅ pnpm 모노레포 세팅 (root, workspace) 🤖
- ✅ Next.js 15 웹 프로젝트 생성 (apps/web) 🤖
- ✅ WXT 크롬 확장 프로젝트 생성 (apps/extension) 🤖
- ✅ 공유 패키지 생성 (packages/shared - 타입, 상수) 🤖
- ✅ 데이터 스크립트 구조 생성 (scripts/) 🤖
- ✅ 배포 설정 (Dockerfile, docker-compose.yml, nginx.conf) 🤖
- ✅ Supabase 테이블 생성 (6개 테이블 + RLS) 🤖
- ✅ .env.local 환경변수 설정 🤝
- ✅ GitHub 리모트 연결 + 첫 커밋 🤝

### Day 3-4: 한자 데이터 파이프라인 (★ 핵심)
- ✅ PM 한자 CSV → hanja_characters 임포트 스크립트 🤖
- ✅ CSV 데이터 실제 임포트 실행 → 5,978개 한자 🤝
- ✅ 우리말샘/표준국어대사전 XML 파싱 → 한자어 추출 (SAX 스트리밍) 🤖
- ✅ 한자어 + 급수 교차 매칭 → hanja_words 589,822개 구축 🤖
- ~~국립국어원 API 보완 스크립트~~ → XML 벌크 데이터로 대체 완료

### Day 5-6: 데이터 품질 + JSON 생성
- ✅ hanja_words 데이터 검증 (급수 분포, 누락 확인) 🤝
- ✅ source 필드 추가 (stdict/opendict 구분) + stdict 우선순위 정렬 🤖
- ✅ 급수별 JSON 사전 파일 생성 스크립트 (523,017 단어, 16개 급수 파일) 🤖
- ✅ 크롬 확장용 JSON 번들링 확인 (apps/extension/public/dict/) 🤖

### Day 7: 인증 시스템
- ✅ Google OAuth 클라이언트 생성 (Chrome 앱용 + 웹 앱용) 🤝
- ✅ Supabase Auth Google 프로바이더 설정 🤝
- ✅ 크롬 확장 manifest key + 고정 ID 설정 (ckncdpmdnfacolnjmnhmckbpjojmfjom) 🤖
- ⏸️ 카카오 OAuth 설정 (Google 먼저 완성 후) 🤝
- ✅ 웹 로그인/로그아웃 UI + 기능 (이메일/비밀번호, 약관동의) 🤖
- ✅ profiles 자동 생성 트리거 (Supabase handle_new_user 트리거 기존 설정) 🤖
- ✅ 미들웨어 인증 처리 (Supabase SSR 세션 갱신) 🤖
- ⬜ 확장 프로그램 내 Supabase 로그인 연동 🤖

---

## Week 2: 크롬 확장 개발

### Day 8-10: 한자 변환 엔진 (핵심)
- ✅ 사전 데이터 로더 — 전체 급수 로드, source 필드 포함 (dictionary.ts) 🤖
- ✅ 토크나이저 — kuromoji-ko 형태소 분석 + 최장일치 매칭 (tokenizer.ts) 🤖
- ✅ 한자 변환 엔진 (converter.ts) 🤖
- ✅ Content Script: DOM 텍스트 스캔 + HTML 변환 🤖
- ✅ MutationObserver 동적 콘텐츠 대응 🤖
- ✅ 변환 제외 요소 처리 (script, input, textarea 등) 🤖

### Day 11-12: 툴팁 UX
- ✅ 마우스 오버 툴팁 (다크 테마, 슬라이드 애니메이션) 🤖
- ✅ 툴팁 위치 자동 판단 (위/아래, viewport 기반) 🤖
- ✅ 동음이의어 전체 표시 + 급수 범위 밖 dim 처리 🤖
- ✅ 클릭하여 한자 전환 + 선호도 학습 (preference.ts) 🤖
- ✅ 정렬: 사용자 선택 > 급수 범위 > stdict 우선 > 급수 쉬운 순 🤖

### Day 13-14: 팝업 + 설정
- ✅ Popup UI (ON/OFF 토글, 레벨 선택 8급~특급) 🤖
- ✅ chrome.storage 설정 저장/불러오기 🤖
- ⬜ 확장 프로그램 내 Supabase 로그인 연동 🤖

---

## Week 2.5: WSD + NER 모델 (★ 핵심 차별화)

> **목표**: 문맥 기반 동음이의어 판별 + 사람 이름 필터링 (멀티태스크)
> **환경**: jinserver (i5-12400, 48GB RAM, RTX 3080 10GB)
> **ETRI API**: ✅ 키 발급 완료, `ner` 코드로 WSD + NER 동시 수집 확인

### Step 1: 학습 데이터 수집 🤖
- ✅ AI Hub 코퍼스 수집 ("한국어 초거대AI 언어모델" 17GB → 370 JSON, 16GB)
- ✅ 동음이의어(76,188개) 포함 문장 추출 — Aho-Corasick O(n) → **50만 문장** (115MB)
- ✅ ETRI WiseNLU API(`ner` 코드)로 자동 라벨링 완료
  - 결과: **8,759 / 9,047 배치** (96.8%) — WSD 637만 라벨, NER 42만 라벨
  - WSD 라벨: scode(의미 번호) 52종
  - NER 라벨: PS_NAME(사람이름), CV_POSITION(직위) 등
- ✅ 학습/검증/테스트 데이터셋 분할 (8:1:1) — **725 단어, 25만 샘플**
- ✅ 데이터셋 v2 확장: min-samples-per-sense=3 → **1,673 단어, 66만 샘플**
- ✅ 국한대백과 크롤링 (2,927 문서, 6,885 WSD 샘플) + 병합
- 🔄 합성 데이터 생성 (소수 의미 불균형 해소) — **2,237개 단어 대상**
  - ✅ Claude 에이전트: 238단어 / 15,707문장
  - 🔄 Gemini 2.5-flash-lite: 1,999단어 / 400배치 jinserver 실행 중

### Step 2: 모델 학습 (jinserver) 🤖
- ✅ Python 환경 구축 (PyTorch 2.10+cu126, Transformers 5.2, CUDA 12.6)
- ✅ 사전학습 모델: **beomi/kcbert-base** (한국어 BERT, 110M 파라미터)
- ✅ WSD v1 파인튜닝 (725개 단어별 분류 헤드) — **Test accuracy: 94.44%**
- ✅ hash 버그 수정 완료 (hashlib.md5로 결정적 해시 전환, 재학습 완료)
- ✅ WSD v2 파인튜닝 (1,673개 단어, 53만 train 샘플) — **val_acc 95.17%** (Epoch 4 best)
- ✅ **KLUE-RoBERTa 교체** (klue/roberta-base) — **val_acc 94.68%, test_acc 94.81%**
- ✅ WSD 품질 안전장치: 빈도 기반 강제/약한 오버라이드 (蟻援→議員 등)
- ✅ 고유어 블록리스트 + 통사 블록리스트 추가
- ⬜ 합성 데이터 병합 후 **v3 재학습** (진행 예정)
- ⬜ NER 태스크 추가 (사람이름 필터링) — 추후 멀티태스크로 확장

### Step 3: 모델 경량화 + 변환 🤖
- ✅ ONNX v1 변환 (725 단어) — 인코더 416MB→INT8 105MB, 헤드 27MB
- ✅ CPU 추론 검증: **18~20ms/단어** (ONNX Runtime)
- ✅ ONNX v2 변환 (1,673 단어) — INT8 105MB, 헤드 62MB
- ✅ API 서버 v2 모델로 업데이트 (heads: 1,673개, 정상 가동)
- ✅ **ONNX v3 변환** (KLUE-RoBERTa) — INT8 107MB, 헤드 26MB, API 서버 교체 완료
- ⬜ ONNX Runtime Web 브라우저 추론 테스트
- ⬜ 추가 경량화 검토 (지식 증류, pruning 등 → 목표 25MB 이하)

### Step 4: 크롬 확장 WSD 통합 🤖
- ✅ background.ts WSD API 프록시 (Mixed Content 우회)
- ✅ wsd.ts API 클라이언트 (헬스체크 + 예측 요청)
- ✅ converter.ts WSD 연동 (동음이의어 자동 판별 → 정답 한자 선택)
- ✅ 폴백: WSD 미지원 단어는 기존 정렬(stdict 우선) 유지
- ⬜ ONNX Runtime Web 번들링 (현재 서버 API 방식 → 브라우저 로컬 추론 전환)
- ⬜ NER: 사람 이름(PS_NAME) 감지 → 한자 변환 제외
- ⬜ 초기 로딩 최적화 (모델 lazy load, 캐싱)

### 대안/폴백 전략
- ✅ **빈도 기반 안전장치**: 예측 한자 빈도 ≤5 + 대안 10배 이상 → 강제 교체
- **규칙 기반 보완**: 고빈도 동음이의어(상위 100개)는 동시출현 패턴으로 수동 규칙 추가
- **사용자 피드백 루프**: 클릭 선호도 데이터가 쌓이면 → 모델 재학습 데이터로 활용

---

## Week 3: 웹 서비스 개발

### Day 15-16: 랜딩 페이지
- ✅ shadcn/ui 설치 + 기본 컴포넌트 세팅 (button, card, badge) 🤖
- ✅ Hero 섹션 (메인 카피 + CTA) — hero-section.tsx 🤖
- ✅ Before/After 데모 섹션 — before-after-section.tsx 🤖
- ✅ 기능 소개 + 사용 방법 섹션 — features-section.tsx, quiz-cta-section.tsx 🤖
- ✅ Footer — footer.tsx 🤖
- ✅ Navbar — navbar.tsx 🤖
- ⬜ 반응형 디자인 + SEO 메타 태그 🤖

### Day 17-19: 진단 테스트
- ⬜ 테스트 문제 데이터 구축 (급수당 10문제) 🤝
- ⬜ 테스트 UI (문제 카드, 진행률 바, 정답/오답) 🤖
- ⬜ 레벨 판정 알고리즘 🤖
- ⬜ 결과 페이지 + SNS 공유 버튼 🤖

### Day 20-21: 마이페이지 + 단어장
- ⬜ 단어장 CRUD UI (목록, 검색, 필터, 삭제) 🤖
- ⬜ "외웠어요" 체크 기능 🤖
- ⬜ 레벨 설정 변경 🤖
- ⬜ 계정 설정 (닉네임, 로그아웃) 🤖

---

## Week 4: 연동 + 배포 + QA

### Day 22-23: 크롬 확장 ↔ 웹 연동
- ✅ 우클릭 메뉴 단어장 저장 기능 (background.ts 컨텍스트 메뉴) 🤖
- ✅ 문맥(문장) 자동 캡처 로직 (content script → background 메시지) 🤖
- ⬜ 저장 성공 토스트 알림 🤖

### Day 24-25: 배포
- ⬜ Docker 이미지 빌드 + Vultr 배포 🤝
- ⬜ hanjahanja.kr SSL 인증서 설정 🤝
- ⬜ 크롬 웹 스토어 등록 신청 🧑

### Day 26-28: QA 및 버그 수정
- ⬜ 주요 사이트 변환 테스트 (네이버 뉴스, 에펨코리아 등) 🤝
- ⬜ 한자어 변환 정확도 검증 (WSD 모델 ON/OFF 비교) 🤝
- ⬜ 성능 테스트 (대용량 페이지 변환 속도) 🤖
- ⬜ 버그 수정 + UX 개선 🤖

---

## 마일스톤 추적

| # | 마일스톤 | 목표 | 상태 |
|---|----------|------|------|
| M0 | PM 사전 준비 완료 | CSV, 우리말샘, API키 | 🔄 (Google OAuth, Chrome Web Store, ETRI 보류) |
| M1 | 프로젝트 세팅 + 데이터 | hanja_words 589,822개, JSON 523,017 단어, source 필드 | ✅ |
| M2 | 한자 변환 작동 | 엔진 + kuromoji-ko 형태소 분석, 크롬 테스트 완료 | ✅ |
| M3 | 툴팁 UX 완성 | 호버 툴팁 + 클릭 전환 + 선호도 학습 + 애니메이션 | ✅ |
| M3.5 | WSD 모델 | 동음이의어 문맥 판별 모델 학습 + ONNX 변환 + 확장 통합 | 🔄 (KLUE-RoBERTa 94.81%, 합성데이터 생성 중, 재학습 예정) |
| M4 | 진단 테스트 완성 | 테스트→레벨 판정→결과 | ⬜ |
| M5 | MVP 통합 완성 | 웹+확장 전체 플로우 | ⬜ |
| M6 | 배포 완료 | hanjahanja.kr 라이브 | ⬜ |
