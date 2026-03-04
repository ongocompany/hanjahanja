# 한자한자 Phase 1 MVP 개발 계획서

> **이 문서는 AI 코딩 도구(Claude Code)가 읽고 구현할 수 있도록 작성되었습니다.**
> PM이 이 문서를 Claude Code에 컨텍스트로 제공하면, AI가 각 모듈을 순서대로 구현할 수 있습니다.

---

## 1. 프로젝트 개요

### 1-1. 서비스 소개

- **서비스명**: 한자한자 (hanjahanja.kr)
- **한줄 설명**: 사용자가 웹서핑할 때 한자어를 자동으로 한자로 변환해서 보여주는 크롬 확장 프로그램 + 웹 서비스
- **레퍼런스**: Toucan (Babbel에 인수된 브라우저 기반 언어 학습 확장 프로그램)

### 1-2. Phase 1 MVP 범위

구현할 것:
- 크롬 확장 프로그램 (한자 자동 변환 + 루비 모드 힌트)
- 웹사이트 (랜딩페이지 + 진단 테스트 + 마이페이지)
- 스마트 단어장 (우클릭 저장 + 문맥 저장)
- 회원 시스템 (구글 + 카카오 로그인)

Phase 1에서 제외 (Phase 2 이후):
- 서바이벌 모드 (게이미피케이션, 하트/토큰 시스템)
- Quizlet/Anki 외부 단어장 내보내기
- 일일 학습 로그 Top 10 통계
- 분야별/직무별 특화 필터
- AI 어원 스토리
- 모바일 앱

### 1-3. 개발 환경

- **개발 방식**: vibe coding (PM이 Claude Code에 지시하여 1인 개발)
- **AI 코딩 도구**: Claude Code (터미널 기반)
- **AI API 계정 보유**: OpenAI, Gemini, Qwen 등 (데이터 가공 및 보조 기능에 활용 가능)

---

## 2. 기술 스택

### 2-1. 기술 스택 요약표

| 영역 | 기술 | 선정 이유 |
|------|------|-----------|
| **프론트엔드 (웹)** | Next.js 14+ (App Router) | Claude Code 호환성 최고, SSR/SEO 지원, Supabase 공식 연동 |
| **스타일링** | Tailwind CSS | 유틸리티 클래스 기반으로 AI가 빠르게 UI 생성 가능 |
| **UI 컴포넌트** | shadcn/ui | 복사-붙여넣기 방식으로 커스터마이징 용이, Tailwind 기반 |
| **백엔드/DB** | Supabase (PostgreSQL) | 이미 사용 중, Auth/DB/Edge Functions 통합 |
| **인증** | Supabase Auth | Google OAuth + Kakao OAuth 지원 |
| **크롬 확장** | WXT Framework + TypeScript | Manifest V3 개발을 단순화, HMR(핫 리로드) 지원 |
| **서버 호스팅** | Vultr (기존 서버) | 이미 운영 중인 서버 활용 |
| **배포** | Docker + Nginx 리버스 프록시 | Vultr 서버에서 안정적 운영, 다른 서비스와 공존 |
| **한자 변환** | 하이브리드 (로컬 사전 DB + 오픈 API 보완) | 로컬 사전으로 빠르게 변환, 부족한 데이터는 국립국어원 API로 보강 |
| **한자어 사전 원본** | 우리말샘 오픈 사전 + 국립국어원 API | 공공 데이터로 한자어 매핑 구축, 무료 |
| **패키지 관리** | pnpm | 빠른 설치 속도, 디스크 효율 |

### 2-2. 기술 용어 설명 (PM용)

- **Next.js**: 웹사이트를 만드는 도구. React를 기반으로 하며, 검색엔진 최적화(SEO)가 좋음
- **Tailwind CSS**: 디자인을 코드로 빠르게 적용하는 도구. `bg-blue-500` 같은 클래스명으로 스타일 적용
- **shadcn/ui**: 버튼, 입력창, 모달 같은 UI 부품 모음. 미리 만들어진 부품을 가져다 씀
- **Supabase**: 데이터 저장소 + 로그인 시스템 + 서버 기능을 하나로 합친 서비스 (Firebase 대안)
- **WXT**: 크롬 확장 프로그램을 쉽게 만들어주는 도구. 복잡한 설정을 자동 처리
- **Docker**: 앱을 상자에 담아서 어디서든 동일하게 실행할 수 있게 해주는 도구
- **Nginx**: 웹 서버. 사용자의 요청을 앱으로 전달하는 교통경찰 역할
- **pnpm**: 자바스크립트 패키지(외부 라이브러리)를 설치하고 관리하는 도구

---

## 3. 시스템 아키텍처

### 3-1. 전체 구조도

```
[사용자 브라우저]
    │
    ├── 크롬 확장 프로그램 (WXT)
    │     ├── Content Script: 웹페이지 텍스트에서 한자어를 찾아 한자로 변환
    │     ├── Popup: 확장 프로그램 설정 패널 (레벨 변경, ON/OFF)
    │     └── Background Script: Supabase 인증 상태 관리, 단어장 저장 API 호출
    │
    └── 웹사이트 (hanjahanja.kr)
          ├── 랜딩 페이지: 서비스 소개 + 진단 테스트 시작 유도
          ├── 진단 테스트 페이지: 한자어 퀴즈 → 레벨 판정
          ├── 마이페이지: 내 단어장 조회, 레벨 설정 변경
          └── 인증 (로그인/회원가입)

[Supabase 클라우드]
    ├── Auth: 구글/카카오 소셜 로그인
    ├── PostgreSQL DB: 유저 정보, 한자 사전 데이터, 단어장, 학습 기록
    └── Edge Functions: (필요 시 서버사이드 로직)

[Vultr 서버]
    └── Docker → Next.js 앱 → Nginx 리버스 프록시 → hanjahanja.kr
```

### 3-2. 데이터 흐름 (한자 변환 과정)

```
1. 사용자가 뉴스 기사를 열면
2. Content Script가 페이지의 텍스트를 스캔
3. 형태소 분석으로 한자어를 추출 (클라이언트 사이드 사전 매칭)
4. 사용자 레벨에 해당하는 한자어만 필터링
5. 원래 텍스트를 한자로 대체하고 루비(힌트) 태그를 삽입
6. 사용자가 마우스를 올리면(hover) 한글 발음과 뜻 팝업 표시
```

### 3-3. 한자 변환 상세 방식

크롬 확장에서 한자 변환은 **클라이언트 사이드 사전 매칭** 방식을 사용합니다.

```
[변환 엔진 동작 원리]

입력 텍스트: "경제 성장률이 하락했다"

Step 1: 텍스트를 토큰으로 분리
→ ["경제", " ", "성장률", "이", " ", "하락", "했다"]

Step 2: 각 토큰을 한자어 사전(JSON)에서 조회
→ "경제" → { hanja: "經濟", level: 7, meaning: "경영하고 다스림", reading: "경제" }
→ "성장률" → { hanja: "成長率", level: 5, meaning: "자라나는 비율", reading: "성장률" }
→ "하락" → { hanja: "下落", level: 6, meaning: "아래로 떨어짐", reading: "하락" }

Step 3: 사용자 레벨(예: 6급) 이하만 필터링
→ "경제"(7급) ✅ 변환, "성장률"(5급) ❌ 레벨 초과, "하락"(6급) ✅ 변환

Step 4: HTML 변환 적용
→ '<ruby>經濟<rp>(</rp><rt>경제</rt><rp>)</rp></ruby> 성장률이 <ruby>下落<rp>(</rp><rt>하락</rt><rp>)</rp></ruby>했다'
```

**핵심 포인트: 서버 호출 없이 확장 프로그램 내장 사전(JSON 파일)으로 변환하므로 빠르고 비용이 없습니다.**

> **PM 참고**: 급수 숫자가 높을수록 쉬운 한자입니다 (8급이 가장 쉽고, 특급이 가장 어려움). 사용자가 6급이면 8급~6급 범위의 한자를 변환합니다.

---

## 4. 데이터베이스 설계

### 4-0. 보유 데이터 현황 (중요)

```
[PM이 현재 보유한 데이터]
- 어문회 8급~특급 개별 한자 목록 (Excel/CSV)
- 예: 經(경, 지날, 7급), 濟(제, 건널, 7급), 社(사, 모일, 8급) ...
- 이것은 "개별 글자" 목록이지, "한자어 매핑"(경제→經濟)이 아님!

[구축해야 하는 데이터]
- 한자어 매핑 사전: "경제"→"經濟", "사회"→"社會" 등
- 이 매핑이 있어야 크롬 확장에서 한글을 한자로 변환할 수 있음

[구축 방법: 하이브리드]
- 1차: 우리말샘(국립국어원) 오픈 사전 데이터를 다운로드하여 한자어 매핑 추출
- 2차: 국립국어원 오픈 API로 부족한 데이터 보완
- 3차: PM 보유 급수 데이터와 교차 매칭하여 급수 정보 부여
```

> **PM 참고**: 진우님이 가진 건 "한자 카드"(經, 濟 개별 글자)이고, 서비스에 필요한 건 "한자어 사전"(경제→經濟)입니다. 우리말샘이라는 국립국어원의 무료 오픈 사전에서 이 매핑 데이터를 추출하고, 진우님의 급수 데이터로 레벨을 매길 겁니다.

### 4-1. Supabase 테이블 구조

```sql
-- ============================================================
-- 테이블 1: profiles (사용자 프로필)
-- 설명: Supabase Auth의 사용자 정보를 확장. 레벨, 설정 등 저장
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,                        -- 닉네임
  current_level INTEGER DEFAULT 8,     -- 현재 한자 레벨 (8급=가장 쉬움, 1=특급)
                                        -- 8급(8), 준7급(7.5), 7급(7), 준6급(6.5)...특급(0)
  is_premium BOOLEAN DEFAULT FALSE,    -- 프리미엄 구독 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 테이블 2: hanja_characters (개별 한자 - PM 보유 데이터)
-- 설명: PM이 보유한 어문회 급수별 개별 한자 목록. 급수 판정의 기준 원본.
-- ============================================================
CREATE TABLE hanja_characters (
  id SERIAL PRIMARY KEY,
  character TEXT NOT NULL UNIQUE,       -- 한자 1글자 (예: "經")
  reading TEXT NOT NULL,                -- 음 (예: "경")
  meaning TEXT NOT NULL,                -- 뜻 (예: "지날")
  level NUMERIC(3,1) NOT NULL,          -- 급수 (8, 7.5, 7, ... 0)
  level_label TEXT NOT NULL,            -- 급수 라벨 (예: "7급", "준7급")
  stroke_count INTEGER,                 -- 획수 (선택)
  radical TEXT,                         -- 부수 (선택)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_hanja_char ON hanja_characters(character);
CREATE INDEX idx_hanja_char_level ON hanja_characters(level);

-- ============================================================
-- 테이블 3: hanja_words (한자어 매핑 사전 - 구축 필요)
-- 설명: 한글 단어 → 한자 변환 매핑. 크롬 확장의 사전 JSON 생성 원본.
--        우리말샘 오픈 사전 + 국립국어원 API로 구축.
-- ============================================================
CREATE TABLE hanja_words (
  id SERIAL PRIMARY KEY,
  korean_word TEXT NOT NULL,            -- 한글 단어 (예: "경제")
  hanja TEXT NOT NULL,                  -- 한자 표기 (예: "經濟")
  reading TEXT NOT NULL,                -- 음 (예: "경제")
  meaning TEXT,                         -- 뜻 (예: "나라를 다스리고 국민을 편안하게 함")
  word_level NUMERIC(3,1),              -- 단어 급수: 구성 한자 중 가장 높은(어려운) 급수
  word_level_label TEXT,                -- 급수 라벨 (예: "7급")
  char_details JSONB,                   -- 개별 한자 분해 (예: [{"char":"經","meaning":"지날","reading":"경","level":7}, ...])
  source TEXT DEFAULT 'urimalsaem',     -- 데이터 출처: 'urimalsaem', 'nikl_api', 'ai_generated'
  frequency INTEGER DEFAULT 0,          -- 사용 빈도 (높을수록 자주 쓰이는 단어)
  is_verified BOOLEAN DEFAULT FALSE,    -- 검증 완료 여부
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 검색 성능을 위한 인덱스
CREATE INDEX idx_hanja_word_korean ON hanja_words(korean_word);
CREATE INDEX idx_hanja_word_level ON hanja_words(word_level);
-- 동일 한글 단어에 여러 한자 표기가 있을 수 있음 (예: 사기→詐欺, 사기→士氣)
CREATE INDEX idx_hanja_word_pair ON hanja_words(korean_word, hanja);

-- ============================================================
-- 테이블 4: user_vocabulary (사용자 단어장)
-- 설명: 사용자가 우클릭으로 저장한 단어 + 문맥
-- ============================================================
CREATE TABLE user_vocabulary (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  word_id INTEGER REFERENCES hanja_words(id),
  korean_word TEXT NOT NULL,           -- 저장한 한글 단어
  hanja TEXT NOT NULL,                 -- 해당 한자
  context_sentence TEXT,               -- 단어가 포함된 원문 문장 (문맥 저장)
  source_url TEXT,                     -- 해당 문장이 있던 웹페이지 URL
  source_title TEXT,                   -- 웹페이지 제목
  is_memorized BOOLEAN DEFAULT FALSE,  -- 외웠는지 여부 체크
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vocab_user ON user_vocabulary(user_id);

-- ============================================================
-- 테이블 5: diagnostic_questions (진단 테스트 문제)
-- 설명: 레벨 진단용 퀴즈 문제 풀
-- ============================================================
CREATE TABLE diagnostic_questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,          -- 문제 텍스트 (예: "'경제'의 한자 표기는?")
  question_type TEXT NOT NULL,          -- 문제 유형: 'meaning'(뜻 맞추기), 'reading'(음 맞추기), 'hanja'(한자 맞추기)
  correct_answer TEXT NOT NULL,         -- 정답
  wrong_answers JSONB NOT NULL,         -- 오답 보기 배열 (예: ["經齊", "輕濟", "景濟"])
  target_level INTEGER NOT NULL,        -- 이 문제가 측정하는 급수
  difficulty INTEGER DEFAULT 1          -- 난이도 (같은 급수 내에서 1=쉬움, 3=어려움)
);

CREATE INDEX idx_diag_level ON diagnostic_questions(target_level);

-- ============================================================
-- 테이블 6: diagnostic_results (진단 테스트 결과)
-- 설명: 사용자의 진단 테스트 히스토리
-- ============================================================
CREATE TABLE diagnostic_results (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_level INTEGER NOT NULL,      -- 판정된 레벨
  score JSONB,                          -- 급수별 정답률 (예: {"8":100, "7":90, "6":60, "5":30})
  taken_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4-2. Supabase RLS (Row Level Security) 정책

```sql
-- 사용자는 자기 프로필만 읽기/수정 가능
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 개별 한자 테이블은 모든 인증된 사용자가 읽기 가능
ALTER TABLE hanja_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read characters" ON hanja_characters FOR SELECT USING (auth.role() = 'authenticated');

-- 한자어 사전은 모든 인증된 사용자가 읽기 가능 (수정 불가)
ALTER TABLE hanja_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read words" ON hanja_words FOR SELECT USING (auth.role() = 'authenticated');

-- 단어장은 자기 것만 CRUD
ALTER TABLE user_vocabulary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own vocabulary" ON user_vocabulary FOR ALL USING (auth.uid() = user_id);

-- 진단 문제는 모두 읽기 가능
ALTER TABLE diagnostic_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read questions" ON diagnostic_questions FOR SELECT USING (true);

-- 진단 결과는 자기 것만
ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own results" ON diagnostic_results FOR ALL USING (auth.uid() = user_id);
```

### 4-3. 한자어 사전 JSON (크롬 확장용)

DB의 `hanja_words` 테이블에서 JSON 파일을 생성하여 크롬 확장에 번들링합니다.

```json
// hanja-dict-level-8.json (8급 이하 한자어 사전 예시)
{
  "경제": {
    "hanja": "經濟",
    "reading": "경제",
    "meaning": "나라를 다스리고 국민을 편안하게 함",
    "level": 7,
    "chars": [
      { "char": "經", "meaning": "지날", "reading": "경", "level": 7 },
      { "char": "濟", "meaning": "건널", "reading": "제", "level": 7 }
    ]
  },
  "사회": {
    "hanja": "社會",
    "reading": "사회",
    "meaning": "같은 무리끼리 모여 이루는 집단",
    "level": 7,
    "chars": [
      { "char": "社", "meaning": "모일", "reading": "사", "level": 8 },
      { "char": "會", "meaning": "모일", "reading": "회", "level": 7 }
    ]
  }
}
```

**단어 급수 산정 규칙**:
- 단어를 구성하는 한자 중 **가장 어려운(급수 낮은) 글자의 급수** = 단어 급수
- 예: "사회(社會)" → 社(8급) + 會(7급) → 단어 급수는 7급 (더 어려운 쪽)
- 이렇게 하면 사용자가 해당 급수의 모든 한자를 아는 상태에서만 변환됨

**사전 JSON 생성 프로세스**:
1. 우리말샘 오픈 사전에서 한자어 매핑 데이터를 추출 → `hanja_words` 테이블에 저장
2. PM 보유 급수 데이터(`hanja_characters`)와 교차 매칭하여 급수 산정
3. 부족한 데이터는 국립국어원 API로 보완
4. 빌드 스크립트가 급수별 JSON 파일 자동 생성
5. 크롬 확장 빌드 시 JSON 파일을 번들에 포함

---

## 5. 프로젝트 디렉토리 구조

```
hanjahanja/
├── apps/
│   ├── web/                          # Next.js 웹사이트
│   │   ├── app/                      # App Router 페이지
│   │   │   ├── layout.tsx            # 공통 레이아웃
│   │   │   ├── page.tsx              # 랜딩 페이지
│   │   │   ├── test/
│   │   │   │   └── page.tsx          # 진단 테스트 페이지
│   │   │   ├── result/
│   │   │   │   └── page.tsx          # 테스트 결과 페이지
│   │   │   ├── mypage/
│   │   │   │   └── page.tsx          # 마이페이지 (단어장, 설정)
│   │   │   ├── auth/
│   │   │   │   ├── login/page.tsx    # 로그인 페이지
│   │   │   │   └── callback/route.ts # OAuth 콜백 처리
│   │   │   └── api/                  # API Routes (필요 시)
│   │   │       └── dictionary/
│   │   │           └── export/route.ts  # 사전 JSON 내보내기 API
│   │   ├── components/               # 재사용 컴포넌트
│   │   │   ├── ui/                   # shadcn/ui 컴포넌트
│   │   │   ├── landing/              # 랜딩 페이지 섹션들
│   │   │   ├── test/                 # 진단 테스트 관련
│   │   │   └── vocabulary/           # 단어장 관련
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts         # 브라우저용 Supabase 클라이언트
│   │   │   │   ├── server.ts         # 서버용 Supabase 클라이언트
│   │   │   │   └── middleware.ts     # 인증 미들웨어
│   │   │   └── utils.ts              # 유틸리티 함수
│   │   ├── public/                   # 정적 파일 (이미지, 아이콘)
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── extension/                    # 크롬 확장 프로그램 (WXT)
│       ├── entrypoints/
│       │   ├── content.ts            # Content Script (한자 변환 핵심 로직)
│       │   ├── popup/                # 확장 프로그램 팝업
│       │   │   ├── index.html
│       │   │   ├── App.tsx
│       │   │   └── main.tsx
│       │   └── background.ts         # Background Script (인증/동기화)
│       ├── components/               # 확장 프로그램 UI 컴포넌트
│       │   ├── HanjaTooltip.tsx      # 마우스 오버 시 뜻/음 툴팁
│       │   └── PopupPanel.tsx        # 팝업 패널 UI
│       ├── lib/
│       │   ├── converter.ts          # 한자 변환 엔진
│       │   ├── dictionary.ts         # 사전 데이터 로더
│       │   ├── supabase.ts           # Supabase 클라이언트 (확장용)
│       │   └── tokenizer.ts          # 텍스트 토큰화 (한자어 추출)
│       ├── assets/
│       │   └── dict/                 # 급수별 한자 사전 JSON 파일
│       │       ├── level-8.json
│       │       ├── level-7.json
│       │       └── ...
│       ├── wxt.config.ts             # WXT 설정
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                       # 웹과 확장 프로그램이 공유하는 코드
│       ├── types/                    # 공용 TypeScript 타입
│       │   ├── hanja.ts              # 한자 관련 타입 정의
│       │   ├── user.ts               # 사용자 관련 타입 정의
│       │   └── index.ts
│       └── constants/                # 공용 상수
│           ├── levels.ts             # 급수 정의 (8급~특급)
│           └── index.ts
│
├── scripts/                          # 유틸리티 스크립트
│   ├── import-characters-csv.ts      # PM 개별 한자 CSV → hanja_characters 임포트
│   ├── parse-urimalsaem-xml.ts       # 우리말샘 XML → 한자어 추출
│   ├── build-hanja-words.ts          # 한자어 + 급수 교차 매칭 → hanja_words 구축
│   ├── supplement-with-api.ts        # 국립국어원 API로 부족 데이터 보완
│   ├── enrich-with-ai.ts             # AI API로 데이터 보강 (뜻풀이, 한자 분해)
│   └── generate-dict-json.ts         # hanja_words → 급수별 JSON 사전 생성
│
├── docker-compose.yml                # Docker 배포 설정
├── Dockerfile                        # Next.js 앱 Docker 이미지
├── nginx.conf                        # Nginx 리버스 프록시 설정
├── pnpm-workspace.yaml               # pnpm 모노레포 설정
├── package.json
└── README.md
```

> **PM 참고**: `apps/web`이 웹사이트, `apps/extension`이 크롬 확장입니다. `packages/shared`는 둘이 공통으로 쓰는 코드입니다. `scripts/`는 데이터 처리용 일회성 스크립트들입니다.

---

## 6. MVP 기능 상세 명세

### 6-1. 랜딩 페이지 (`/`)

**목적**: 서비스 소개 + 진단 테스트 유도 + 확장 프로그램 설치 유도

**구성 섹션**:

```
[Hero 섹션]
- 메인 카피: "당신의 일상 텍스트가 가장 완벽한 한자 교재가 됩니다."
- 서브 카피: 평소 읽는 뉴스, 블로그 글이 자동으로 한자 교재로 변합니다
- CTA 버튼: "내 문해력 수준 알아보기 →" (진단 테스트 페이지로 이동)

[데모 섹션]
- Before/After 비교 이미지 또는 애니메이션
- 일반 뉴스 기사 → 한자 변환된 기사 비교

[기능 소개 섹션]
- 카드 3개: 자동 변환 / 루비 모드 힌트 / 스마트 단어장
- 각 카드에 아이콘 + 한줄 설명

[사용 방법 섹션]
- Step 1: 테스트로 레벨 진단
- Step 2: 크롬 확장 설치
- Step 3: 평소처럼 웹서핑

[Footer]
- 서비스 소개 링크, 문의, 개인정보처리방침
```

**기술 구현 사항**:
- SEO 최적화: Next.js SSG (정적 생성)으로 빌드
- 반응형 디자인: Tailwind CSS의 반응형 클래스 활용 (모바일에서도 보기 좋게)
- 로딩 속도 최적화: 이미지 최적화 (next/image), 폰트 최적화

### 6-2. 진단 테스트 (`/test`)

**목적**: 사용자의 한자 수준을 자동 판정하여 적절한 레벨 배정

**동작 흐름**:

```
1. 사용자가 "테스트 시작" 클릭
2. 8급부터 순차적으로 문제 출제 (급수당 3~5문제)
3. 해당 급수 정답률이 60% 이상이면 다음 급수로 진행
4. 정답률 60% 미만이면 테스트 종료
5. 마지막으로 통과한 급수를 사용자 레벨로 설정
6. 결과 페이지에서 레벨 표시 + 로그인/회원가입 유도
```

**문제 유형**:
- **한자 읽기**: 한자를 보고 올바른 한글 독음 고르기 (4지선다)
- **뜻 매칭**: 한자어의 뜻을 고르기 (4지선다)
- **한자 쓰기**: 한글 단어를 보고 올바른 한자 표기 고르기 (4지선다)

**UI 요소**:
- 진행률 표시 바 (Progress bar)
- 문제 카드 (질문 + 4개 보기 버튼)
- 정답/오답 피드백 애니메이션 (초록/빨강 깜빡임)
- 타이머 없음 (부담 없이 풀도록)

**기술 구현 사항**:
- 비로그인 상태에서도 테스트 가능 (결과 저장만 로그인 필요)
- 문제는 `diagnostic_questions` 테이블에서 급수별로 랜덤 추출
- 클라이언트 상태 관리: React useState로 충분 (별도 상태관리 라이브러리 불필요)

### 6-3. 테스트 결과 페이지 (`/result`)

**목적**: 결과 표시 + 회원가입/로그인 유도 + 확장 프로그램 설치 유도

**화면 구성**:

```
[결과 카드]
- "진우 님의 추천 레벨은 [6급]입니다!"
- 급수별 정답률 시각화 (간단한 막대 그래프)
- SNS 공유 버튼 (카카오톡, 트위터) - "내 문해력은 6급!" 공유

[다음 단계 안내]
- 비로그인 상태: "결과를 저장하고 학습을 시작하세요" → 로그인 버튼
- 로그인 상태: "크롬 확장 프로그램을 설치하세요" → 웹스토어 링크
```

### 6-4. 크롬 확장 프로그램

#### 6-4-1. Content Script (핵심: 한자 변환 엔진)

**동작 방식**:

```
[페이지 로드 감지]
      ↓
[사용자 설정 확인] → ON/OFF 상태, 현재 레벨
      ↓
[DOM 텍스트 노드 순회]
      ↓
[텍스트에서 한자어 후보 추출] → 2글자 이상의 한글 단어를 사전에서 조회
      ↓
[사용자 레벨 필터링] → 해당 급수 이하인 단어만 선택
      ↓
[HTML 변환] → <ruby> 태그로 한자 + 힌트 삽입
      ↓
[이벤트 리스너 등록] → hover 시 툴팁, 우클릭 시 단어장 저장
```

**한자어 추출 방식 (토크나이저)**:

한국어 형태소 분석기 없이, 사전 기반 최장일치(Longest Match) 방식을 사용합니다.

```typescript
// tokenizer.ts - 의사코드
function findHanjaWords(text: string, dictionary: Dict): Match[] {
  const matches: Match[] = [];
  let i = 0;

  while (i < text.length) {
    let longestMatch = null;

    // 최장 일치: 4글자부터 2글자까지 역순으로 시도
    for (let len = 4; len >= 2; len--) {
      const candidate = text.substring(i, i + len);
      if (dictionary[candidate]) {
        longestMatch = { word: candidate, data: dictionary[candidate], position: i };
        break;
      }
    }

    if (longestMatch) {
      matches.push(longestMatch);
      i += longestMatch.word.length;
    } else {
      i++;
    }
  }

  return matches;
}
```

**주의할 점**:
- 이미 변환된 영역은 건드리지 않기 (중복 변환 방지)
- `<script>`, `<style>`, `<input>`, `<textarea>` 등 비표시/입력 요소는 스킵
- 동적으로 로드되는 콘텐츠 대응: MutationObserver로 DOM 변경 감지

#### 6-4-2. 루비 모드 (Hover 툴팁)

```
[사용자가 변환된 한자 위에 마우스를 올림]
      ↓
[툴팁 팝업 표시]
┌─────────────────────┐
│  經濟 (경제)          │
│  뜻: 경영하고 다스림    │
│  ─────────────        │
│  經: 지날 경           │
│  濟: 건널 제           │
│                        │
│  [📖 단어장에 추가]     │
└─────────────────────┘
```

**구현 방식**:
- CSS `position: absolute`로 마우스 위치 근처에 표시
- 마우스가 떠나면(mouseleave) 300ms 후 닫기
- 툴팁 내 "단어장에 추가" 클릭 시 Supabase에 저장

#### 6-4-3. 팝업 (Popup)

확장 프로그램 아이콘 클릭 시 나타나는 패널:

```
┌─────────────────────┐
│  한자한자              │
│  ─────────────        │
│  🟢 변환 활성화        │  ← ON/OFF 토글
│                        │
│  현재 레벨: 6급        │  ← 드롭다운으로 변경 가능
│                        │
│  오늘 본 한자: 47개    │  ← 간단한 통계
│                        │
│  [마이페이지 열기]      │  ← hanjahanja.kr/mypage 링크
│  [로그인]              │  ← 비로그인 시 표시
└─────────────────────┘
```

#### 6-4-4. 우클릭 메뉴 (Context Menu) - 단어장 저장

```
[사용자가 변환된 한자를 우클릭]
      ↓
[컨텍스트 메뉴에 "한자한자 단어장에 추가" 항목 표시]
      ↓
[클릭 시]
      ↓
[저장 데이터]
- korean_word: "경제"
- hanja: "經濟"
- context_sentence: "글로벌 經濟 성장이 둔화되고 있다는..." (해당 문장 전체)
- source_url: "https://news.naver.com/..."
- source_title: "글로벌 경제 전망 보고서"
      ↓
[Supabase user_vocabulary 테이블에 INSERT]
      ↓
[성공 시 토스트 알림: "✅ '경제(經濟)'를 단어장에 저장했습니다"]
```

### 6-5. 마이페이지 (`/mypage`)

**목적**: 저장한 단어 복습, 레벨 변경, 계정 설정

**화면 구성**:

```
[상단: 사용자 정보]
- 닉네임, 현재 레벨, 가입일

[탭 1: 내 단어장]
- 저장한 단어 리스트 (테이블 형태)
  | 한자    | 한글  | 뜻              | 저장한 문장 (접기/펴기) | 출처    | 날짜    |
  | 經濟    | 경제  | 경영하고 다스림   | "글로벌 경제..."       | 네이버  | 3/1     |
- 검색/필터: 급수별 필터, 텍스트 검색
- "외웠어요" 체크 기능
- 단어 삭제 기능

[탭 2: 레벨 설정]
- 현재 레벨 표시 + 변경 드롭다운
- "다시 테스트하기" 버튼

[탭 3: 계정 설정]
- 닉네임 변경
- 로그아웃
```

### 6-6. 인증 시스템

**로그인 흐름**:

```
[로그인 페이지]
      ↓
[구글 로그인 버튼] 또는 [카카오 로그인 버튼]
      ↓
[Supabase Auth → OAuth Provider로 리다이렉트]
      ↓
[사용자가 Google/Kakao에서 인증]
      ↓
[/auth/callback으로 리다이렉트 → Supabase 세션 생성]
      ↓
[profiles 테이블에 사용자 레코드 자동 생성 (없으면)]
      ↓
[마이페이지 또는 이전 페이지로 이동]
```

**Supabase 카카오 OAuth 설정**:
1. Kakao Developers에서 앱 생성
2. REST API 키 발급
3. Supabase Dashboard → Authentication → Providers → Kakao 활성화
4. Redirect URL 설정: `https://[supabase-project].supabase.co/auth/v1/callback`

**크롬 확장 프로그램 인증 연동**:
- 확장 프로그램은 웹사이트의 Supabase 세션을 공유하지 못함
- 해결 방법: 확장 프로그램 Popup에서 별도 로그인 → Supabase Auth 토큰을 `chrome.storage.local`에 저장

---

## 7. 한자 데이터 구축 가이드 (핵심 선행 작업)

> **PM 참고**: 이 섹션이 프로젝트에서 가장 중요한 선행 작업입니다. 한자어 사전 데이터가 없으면 크롬 확장의 변환 기능이 작동하지 않습니다. Week 1에서 반드시 완료해야 합니다.

### 7-0. 데이터 구축 전체 흐름도

```
[현재 보유 데이터]                    [구축해야 할 데이터]
PM의 개별 한자 CSV                    한자어 매핑 사전
(經, 경, 지날, 7급)                   (경제 → 經濟, 7급)
        │                                    ↑
        │                                    │
        ▼                                    │
┌──────────────────┐                         │
│ Step 1            │                         │
│ PM CSV →          │                         │
│ hanja_characters  │                         │
│ 테이블 임포트      │                         │
└──────────────────┘                         │
                                              │
┌──────────────────┐    ┌──────────────────┐  │
│ Step 2            │    │ Step 3            │  │
│ 우리말샘 오픈사전  │───→│ 한자어 추출 +      │──┘
│ XML 다운로드       │    │ 급수 교차 매칭     │
└──────────────────┘    └──────────────────┘
                                  │
                         부족한 데이터?
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ Step 4            │
                        │ 국립국어원 API로   │
                        │ 추가 데이터 보완   │
                        └──────────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ Step 5            │
                        │ hanja_words →     │
                        │ 급수별 JSON 생성   │
                        │ → 크롬 확장 번들   │
                        └──────────────────┘
```

### 7-1. Step 1 - PM 보유 개별 한자 데이터 임포트

```
[입력] PM의 Excel/CSV 파일 (어문회 8급~특급 개별 한자 목록)

CSV 예상 형식:
character,reading,meaning,level,level_label
經,경,지날,7,7급
濟,제,건널,7,7급
社,사,모일,8,8급
會,회,모일,7,7급
...

[실행] scripts/import-characters-csv.ts
→ Supabase hanja_characters 테이블에 삽입

[결과] 약 3,500개의 개별 한자가 급수 정보와 함께 DB에 저장됨
```

> **PM 할 일**: CSV 파일의 컬럼명을 위 형식에 맞춰 정리해주세요. Claude Code가 임포트 스크립트를 만들어줄 겁니다.

### 7-2. Step 2 - 우리말샘 오픈 사전 다운로드

```
[우리말샘(Urimalsaem) 오픈 사전이란?]
- 국립국어원이 운영하는 온라인 국어사전 (https://opendict.korean.go.kr)
- 약 110만 표제어가 포함된 대규모 사전
- XML 형태로 전체 데이터 다운로드 가능 (무료, 공공 데이터)
- 각 단어 항목에 한자 표기(원어) 정보가 포함되어 있음

[다운로드 방법]
1. 우리말샘 개방 데이터 페이지 접속: https://opendict.korean.go.kr/service/dicFreeView
2. 전체 사전 데이터 다운로드 신청 (XML 형식)
3. 승인 후 다운로드 (대용량, 수 GB)

또는
1. 국립국어원 언어정보나눔터: https://ithub.korean.go.kr
2. 한국어 학습용 어휘 목록, 한자어 목록 등 다운로드 가능

[대안: 한국어기초사전 API]
- 별도 다운로드 없이 API로 조회도 가능
- https://krdict.korean.go.kr/openApi/openApiInfo
```

> **PM 할 일**: 우리말샘 또는 언어정보나눔터에서 데이터를 미리 다운로드해두면 좋습니다. 계정 생성 + 다운로드 신청이 필요할 수 있어 1~2일 걸릴 수 있습니다.

### 7-3. Step 3 - 한자어 추출 + 급수 교차 매칭

```
[처리 로직] scripts/build-hanja-words.ts

1. 우리말샘 XML에서 한자어 항목 추출
   - <entry> 태그에서 <word>경제</word> + <original_language>經濟</original_language> 추출
   - 한자 원어가 있는 항목만 필터링

2. PM 급수 데이터(hanja_characters)와 교차 매칭
   - "경제(經濟)"의 각 글자를 hanja_characters에서 조회
   - 經 → 7급, 濟 → 7급 → 단어 급수 = 7급 (가장 어려운 글자 기준)

3. 급수 매칭 불가 케이스 처리
   - hanja_characters에 없는 한자가 포함된 단어 → 별도 표시 (is_verified = false)
   - Step 4에서 API로 보완하거나, 해당 단어는 변환 대상에서 제외

4. Supabase hanja_words 테이블에 저장

[예상 결과]
- 추출 가능한 한자어: 약 5만~10만개 (전체)
- 8급~4급 범위 (MVP 대상): 약 3,000~8,000개
- 급수 매칭 성공률: 약 80~90% (나머지는 Step 4에서 보완)
```

```typescript
// scripts/build-hanja-words.ts - 핵심 로직 의사코드

interface HanjaWord {
  korean_word: string;    // "경제"
  hanja: string;          // "經濟"
  meaning: string;        // 우리말샘에서 추출한 뜻
  word_level: number;     // 구성 한자 중 가장 어려운 급수
  char_details: CharDetail[];
}

function calculateWordLevel(hanja: string, charDB: Map<string, HanjaChar>): number {
  let hardestLevel = 8; // 가장 쉬운 급수로 시작

  for (const char of hanja) {
    const charInfo = charDB.get(char);
    if (charInfo) {
      // 급수 값이 작을수록 어려움 (8급=8 > 7급=7 > ... > 특급=0)
      hardestLevel = Math.min(hardestLevel, charInfo.level);
    } else {
      // DB에 없는 한자 → 급수 판정 불가, 검증 필요 표시
      return -1; // is_verified = false로 처리
    }
  }

  return hardestLevel;
}
```

### 7-4. Step 4 - 국립국어원 API로 부족한 데이터 보완

```
[국립국어원 오픈 API]
- 신청 URL: https://opendict.korean.go.kr/service/openApiInfo
- API 키 발급: 회원가입 후 즉시 발급 (무료)
- 일일 호출 제한: 약 50,000건/일 (충분)

[활용 시나리오]
시나리오 A: 우리말샘 XML에서 뜻(meaning)이 빈 항목 보완
시나리오 B: 급수 매칭이 안 된 한자의 정보 조회
시나리오 C: 특정 급수 범위의 한자어를 추가 수집

[API 호출 예시]
GET https://opendict.korean.go.kr/api/search
  ?key={API_KEY}
  &q=경제
  &advanced=y
  &method=exact
  &type1=word

[응답에서 추출할 정보]
- 표제어 (한글)
- 원어 (한자)
- 뜻풀이
```

```typescript
// scripts/supplement-with-api.ts - 의사코드

async function supplementFromAPI(missingWords: HanjaWord[]) {
  for (const word of missingWords) {
    const response = await fetch(
      `https://opendict.korean.go.kr/api/search?key=${API_KEY}&q=${word.korean_word}&method=exact`
    );
    const data = await response.json();

    // 응답에서 한자 원어와 뜻 추출
    if (data.channel.item) {
      word.meaning = data.channel.item[0].sense.definition;
      word.is_verified = true;
    }

    // API 호출 간격 (rate limiting): 100ms
    await sleep(100);
  }
}
```

### 7-5. Step 5 - AI API 활용 데이터 보강 (선택)

국립국어원 데이터만으로 부족한 부분을 AI API로 보강합니다.

```
[활용 시나리오]
- char_details(개별 한자 분해) 데이터 자동 생성
- 뜻풀이가 너무 길거나 어려울 때 쉬운 설명으로 변환
- 진단 테스트 문제 자동 생성
```

```typescript
// scripts/enrich-with-ai.ts - 의사코드

// 1. 개별 한자 분해 데이터 보강
const prompt1 = `
다음 한자어의 각 글자별 음과 뜻을 JSON으로 알려줘.
한자어: 經濟

응답 형식:
[{"char": "經", "meaning": "지날", "reading": "경"}, {"char": "濟", "meaning": "건널", "reading": "제"}]
`;

// 2. 뜻풀이 간소화
const prompt2 = `
다음 한자어의 뜻을 중학생이 이해할 수 있게 15자 이내로 설명해줘.
한자어: 經濟 (경제)
사전 뜻: "인간의 생활에 필요한 재화나 용역을 생산·분배·소비하는 모든 활동"
→ 간단한 뜻:
`;

// → hanja_words 테이블의 빈 필드에 배치 업데이트
```

### 7-6. 데이터 품질 기준

- **필수 필드**: korean_word, hanja, word_level (이것만 있으면 기본 변환 가능)
- **권장 필드**: meaning, char_details (루비 모드 툴팁의 품질 향상)
- **MVP 목표 데이터량**: 8급~4급 한자어 최소 3,000개 이상
- **검증 기준**: is_verified = true인 단어가 전체의 80% 이상

### 7-7. PM 사전 준비 체크리스트

```
□ 개별 한자 CSV 파일 정리 (character, reading, meaning, level, level_label 컬럼)
□ 우리말샘 오픈 데이터 다운로드 신청 (https://opendict.korean.go.kr)
  또는 언어정보나눔터 데이터 다운로드 (https://ithub.korean.go.kr)
□ 국립국어원 오픈 API 키 발급 신청 (https://opendict.korean.go.kr/service/openApiInfo)
□ (선택) 한국어기초사전 API 키도 발급 (https://krdict.korean.go.kr/openApi/openApiInfo)
```

> **PM 참고**: 위 체크리스트의 신청 작업은 **개발 시작 전에 미리** 해두세요. 데이터 다운로드 승인에 1~3일 걸릴 수 있습니다.

---

## 8. 개발 일정 (5주 스프린트)

> **일정 변경 사항**: 한자어 사전 데이터 구축이 추가되어 기존 4주에서 5주로 조정. Week 0(사전 준비)이 추가되었습니다.

### 8-0. 사전 준비 (Week 0, 개발 시작 전)

```
[PM이 직접 해야 할 일] ━━━━━━━━━━━━━━━━━━━━━━
  □ 개별 한자 CSV 파일 정리 (컬럼: character, reading, meaning, level, level_label)
  □ 우리말샘 오픈 데이터 다운로드 신청 (승인까지 1~3일 소요)
  □ 국립국어원 오픈 API 키 발급 신청
  □ (선택) 한국어기초사전 API 키 발급
  □ Kakao Developers 앱 생성 + REST API 키 발급
  □ Google Cloud Console에서 OAuth 클라이언트 ID 발급
```

### 8-1. 주차별 일정

```
[Week 1: 기반 구축 + 데이터 파이프라인] ━━━━━━━━━━━━
  Day 1-2: 프로젝트 초기 설정
    - pnpm 모노레포 세팅
    - Next.js 프로젝트 생성 (apps/web)
    - WXT 크롬 확장 프로젝트 생성 (apps/extension)
    - Supabase 프로젝트 설정 (테이블 생성, RLS 설정)
    - 환경 변수 설정 (.env 파일)

  Day 3-4: 한자 데이터 파이프라인 구축 (★ 핵심)
    - PM 개별 한자 CSV → hanja_characters 테이블 임포트 스크립트
    - 우리말샘 XML 파싱 → 한자어 추출 스크립트
    - 한자어 + 급수 교차 매칭 → hanja_words 구축 스크립트
    - 국립국어원 API 보완 스크립트

  Day 5-6: 데이터 품질 확인 + JSON 생성
    - hanja_words 테이블 데이터 검증 (급수 분포, 누락 확인)
    - AI API로 부족한 뜻풀이/한자 분해 데이터 보강
    - 급수별 JSON 사전 파일 생성 스크립트
    - 크롬 확장용 JSON 번들링 확인

  Day 7: 인증 시스템
    - Supabase Auth 설정 (구글 + 카카오 OAuth)
    - 웹사이트 로그인/로그아웃 UI 및 기능
    - profiles 테이블 자동 생성 트리거 (Supabase Function)

[Week 2: 크롬 확장 개발] ━━━━━━━━━━━━━━━━━━━━━━
  Day 8-10: 크롬 확장 - 한자 변환 엔진
    - Content Script: 텍스트 스캔 + 사전 매칭 + HTML 변환
    - 토큰라이저 (최장일치 알고리즘)
    - MutationObserver로 동적 콘텐츠 대응
    - 변환 제외 요소 처리 (script, input 등)

  Day 11-12: 크롬 확장 - 루비 모드
    - Hover 툴팁 UI (한자 뜻/음 표시)
    - 툴팁 위치 계산 로직
    - 스타일링 (다크모드 대응 포함)

  Day 13-14: 크롬 확장 - 팝업 + 설정
    - Popup UI (ON/OFF 토글, 레벨 선택, 통계)
    - chrome.storage를 이용한 설정 저장
    - 확장 프로그램 내 Supabase 로그인 연동

[Week 3: 웹 서비스 개발] ━━━━━━━━━━━━━━━━━━━━━━
  Day 15-16: 랜딩 페이지
    - Hero 섹션 + 데모 섹션 + 기능 소개
    - 반응형 디자인
    - SEO 메타 태그

  Day 17-19: 진단 테스트
    - 테스트 문제 데이터 구축 (급수당 10문제, AI API 활용)
    - 테스트 UI (문제 카드, 진행률 바, 정답/오답 피드백)
    - 레벨 판정 알고리즘
    - 결과 페이지 + SNS 공유 버튼

  Day 20-21: 마이페이지 + 단어장
    - 단어장 CRUD UI (목록, 검색, 필터, 삭제)
    - 레벨 설정 변경
    - 계정 설정

[Week 4: 연동 + 배포 + QA] ━━━━━━━━━━━━━━━━━━━━
  Day 22-23: 크롬 확장 ↔ 웹 연동
    - 우클릭 메뉴 단어장 저장 기능
    - 문맥(문장) 자동 캡처 로직
    - 저장 성공 토스트 알림

  Day 24-25: 배포
    - Docker 이미지 빌드 (Next.js)
    - Vultr 서버 배포 (Docker Compose + Nginx)
    - 도메인(hanjahanja.kr) SSL 인증서 설정
    - 크롬 웹 스토어에 확장 프로그램 등록 신청

  Day 26-28: QA 및 버그 수정
    - 주요 사이트(네이버 뉴스, 에펨코리아 등)에서 변환 테스트
    - 한자어 변환 정확도 검증 (오변환 사례 수집 및 사전 보정)
    - 성능 테스트 (대용량 페이지에서 변환 속도)
    - 버그 수정 및 UX 개선
```

### 8-2. 주요 마일스톤

| 마일스톤 | 목표일 | 완료 기준 |
|----------|--------|-----------|
| M0: PM 사전 준비 완료 | Week 0 | CSV 정리, 우리말샘 다운로드, API 키 발급 완료 |
| M1: 프로젝트 세팅 + 데이터 구축 | Week 1 Day 6 | 모노레포 구조, hanja_words 3,000개+, JSON 사전 생성 |
| M2: 한자 변환 작동 | Week 2 Day 10 | 뉴스 기사에서 한자어가 한자로 변환됨 |
| M3: 루비 모드 작동 | Week 2 Day 12 | Hover 시 한글 뜻/음 툴팁 표시 |
| M4: 진단 테스트 완성 | Week 3 Day 19 | 테스트 → 레벨 판정 → 결과 표시 |
| M5: MVP 통합 완성 | Week 4 Day 23 | 웹 + 확장 프로그램 전체 플로우 작동 |
| M6: 배포 완료 | Week 4 Day 25 | hanjahanja.kr 접속 가능, 확장 프로그램 설치 가능 |

---

## 9. 배포 가이드

### 9-1. Vultr 서버 배포 (Docker)

```yaml
# docker-compose.yml
version: '3.8'

services:
  hanjahanja-web:
    build: .
    container_name: hanjahanja-web
    ports:
      - "3100:3000"     # 호스트 3100 → 컨테이너 3000 (다른 서비스와 포트 충돌 방지)
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    restart: unless-stopped
```

```nginx
# nginx.conf (hanjahanja.kr 서버 블록 추가)
server {
    listen 443 ssl;
    server_name hanjahanja.kr www.hanjahanja.kr;

    ssl_certificate /etc/letsencrypt/live/hanjahanja.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hanjahanja.kr/privkey.pem;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 9-2. 크롬 웹 스토어 등록

```
1. Chrome Web Store Developer Dashboard 계정 생성 (등록비 $5 일회성)
2. WXT로 빌드: pnpm --filter extension build
3. 빌드 결과물(.output/chrome-mv3) ZIP 압축
4. Developer Dashboard에서 업로드 + 스토어 정보 입력
5. 심사 제출 (보통 1~3일 소요, 최대 1주일)
```

> **PM 참고**: 크롬 웹 스토어 심사에 시간이 걸리므로, Week 4 초반에 미리 제출하세요. 심사 중에도 "비공개" 또는 "테스터 전용"으로 먼저 등록할 수 있습니다.

---

## 10. Vibe Coding 실전 가이드

### 10-1. Claude Code에 이 계획서를 활용하는 방법

```
[Step 1] 프로젝트 폴더에 이 계획서를 저장
$ cp 한자한자_Phase1_개발계획서.md /path/to/hanjahanja/PLAN.md

[Step 2] Claude Code 실행 후 컨텍스트 제공
$ claude
> @PLAN.md 를 읽고 Week 1 Day 1-2 작업을 시작해줘. 모노레포 세팅부터.

[Step 3] 주차별로 진행
> @PLAN.md 의 Week 2 작업을 진행해줘. 크롬 확장 한자 변환 엔진부터 시작.
```

### 10-2. Claude Code 사용 시 효과적인 지시 방법

**좋은 예시:**
```
"PLAN.md의 6-4-1. Content Script를 구현해줘.
converter.ts에 최장일치 알고리즘 구현하고,
content.ts에서 페이지 로드 시 변환 실행하게 만들어줘.
테스트는 '경제 성장률이 하락했다' 텍스트로 해줘."
```

**피해야 할 예시:**
```
"한자 변환 기능 만들어줘" (너무 모호함)
```

### 10-3. 트러블슈팅 가이드

| 상황 | 대응 방법 |
|------|-----------|
| 우리말샘 XML 파싱 실패 | XML 인코딩 확인 (UTF-8). 파일이 너무 크면 분할 처리. xml2js 또는 sax 라이브러리 사용 |
| 한자어 급수 매칭률이 낮음 | PM 한자 CSV 데이터의 character 필드 형식 확인. 번체/간체 혼용 여부 점검 |
| 동음이의 한자어 충돌 | 예: "사기"→詐欺 vs 士氣. 빈도(frequency) 기준으로 우선순위 설정하거나, 문맥 기반 필터링 추가 |
| 크롬 확장이 특정 사이트에서 안 됨 | Content Script의 `matches` 패턴 확인. CSP(Content Security Policy)가 강한 사이트는 제한될 수 있음 |
| Supabase 인증이 안 됨 | Supabase Dashboard에서 Redirect URL 설정 확인. localhost와 프로덕션 URL 모두 등록 필요 |
| 한자 변환 속도가 느림 | 사전 JSON 크기 확인. 너무 크면 급수별로 분리하여 필요한 것만 로드 |
| 카카오 로그인이 안 됨 | Kakao Developers에서 "카카오 로그인" 활성화 + Redirect URI 등록 확인 |
| 웹 스토어 심사 거절 | 거절 사유를 확인하고 수정. 가장 흔한 사유: 권한 요청 과다, 개인정보처리방침 미비 |
| 국립국어원 API 호출 실패 | API 키 만료 여부 확인. 일일 호출 제한(50,000건) 초과 확인. rate limiting(100ms 간격) 적용 |

---

## 11. 참고 리소스

### 11-1. 핵심 문서 링크

**프레임워크/라이브러리**:
- **Next.js 공식 문서**: https://nextjs.org/docs
- **WXT (크롬 확장 프레임워크)**: https://wxt.dev
- **Supabase 문서**: https://supabase.com/docs
- **Supabase Auth (OAuth)**: https://supabase.com/docs/guides/auth
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Chrome Extensions Manifest V3**: https://developer.chrome.com/docs/extensions/mv3

**한자 데이터 소스**:
- **우리말샘 오픈 사전**: https://opendict.korean.go.kr
- **우리말샘 오픈 API**: https://opendict.korean.go.kr/service/openApiInfo
- **국립국어원 언어정보나눔터**: https://ithub.korean.go.kr
- **한국어기초사전 API**: https://krdict.korean.go.kr/openApi/openApiInfo

### 11-2. 유사 서비스 참고

- **Toucan (Babbel)**: 투칸의 크롬 확장 UX를 참고 (현재 Babbel에 통합됨)
- **10ten Japanese Reader**: 일본어 한자 읽기 보조 크롬 확장. 루비 모드 UX 참고용

---

## 부록 A: 급수 체계 매핑

```
어문회 급수  →  DB level 값  →  난이도
──────────────────────────────────
8급         →  8            →  가장 쉬움 (50자)
준7급       →  7.5          →
7급         →  7            →  (150자)
준6급       →  6.5          →
6급         →  6            →  (225자)
준5급       →  5.5          →
5급         →  5            →  (325자)
준4급       →  4.5          →
4급         →  4            →  (500자)  ← 무료 범위 끝
─── 여기부터 프리미엄 ───────────
준3급       →  3.5          →
3급         →  3            →  (1,000자)
준2급       →  2.5          →
2급         →  2            →  (1,500자)
준1급       →  1.5          →
1급         →  1            →  (2,000자)
준특급      →  0.5          →
특급        →  0            →  가장 어려움 (3,500자)
```

> **MVP에서는 8급~4급까지 (무료 범위)만 구현합니다. 프리미엄 급수는 Phase 2에서 추가합니다.**

---

## 부록 B: 환경 변수 목록

```env
# .env.local (웹사이트용)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...          # 서버 사이드에서만 사용, 절대 노출 금지

# Kakao OAuth (Supabase Dashboard에서 설정)
# → Kakao Developers에서 REST API 키 발급 후 Supabase에 입력

# Google OAuth (Supabase Dashboard에서 설정)
# → Google Cloud Console에서 OAuth 클라이언트 ID 발급 후 Supabase에 입력

# 국립국어원 오픈 API (한자어 사전 구축용)
NIKL_API_KEY=...                               # 우리말샘 오픈 API 키
KRDICT_API_KEY=...                             # (선택) 한국어기초사전 API 키

# AI API (데이터 보강 스크립트용)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

```env
# .env (크롬 확장용, WXT에서 사용)
WXT_SUPABASE_URL=https://xxxxx.supabase.co
WXT_SUPABASE_ANON_KEY=eyJhbG...
```
