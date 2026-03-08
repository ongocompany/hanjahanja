-- ============================================================
-- 한자한자 Phase 1 - 개인화 기능 스키마
-- 노출 추적, 클릭 추적, 사자성어
-- ============================================================

-- ============================================================
-- 테이블 1: user_exposures (노출 이력 — 날짜별 집계)
-- 유저가 웹서핑 중 본 한자어를 날짜별로 카운팅
-- ============================================================
CREATE TABLE user_exposures (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  korean_word TEXT NOT NULL,            -- 한글 단어 (예: "경제")
  hanja TEXT NOT NULL,                  -- 노출된 한자 (예: "經濟")
  exposure_count INTEGER DEFAULT 1,     -- 하루 내 노출 횟수
  exposure_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, korean_word, hanja, exposure_date)
);

CREATE INDEX idx_exposure_user_date ON user_exposures(user_id, exposure_date);
CREATE INDEX idx_exposure_user_count ON user_exposures(user_id, exposure_count DESC);

-- ============================================================
-- 테이블 2: user_clicks (클릭 이력 — 개별 이벤트)
-- 유저가 툴팁에서 한자를 클릭(선택)한 이벤트
-- ============================================================
CREATE TABLE user_clicks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  korean_word TEXT NOT NULL,
  hanja TEXT NOT NULL,
  context_sentence TEXT,                -- 클릭 시점의 문장
  source_url TEXT,                      -- 출처 URL
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clicks_user_date ON user_clicks(user_id, clicked_at);

-- ============================================================
-- 테이블 3: idioms (사자성어)
-- 노출 단어와 연관된 사자성어 추천용
-- ============================================================
CREATE TABLE idioms (
  id SERIAL PRIMARY KEY,
  idiom TEXT NOT NULL UNIQUE,           -- 사자성어 (예: "經世濟民")
  reading TEXT NOT NULL,                -- 읽기 (예: "경세제민")
  meaning TEXT NOT NULL,                -- 뜻풀이
  characters TEXT[] NOT NULL,           -- 구성 한자 배열 ['經','世','濟','民']
  level NUMERIC(3,1)                    -- 난이도 (구성 한자 중 가장 어려운 급수)
);

CREATE INDEX idx_idioms_characters ON idioms USING GIN(characters);

-- ============================================================
-- RLS 정책
-- ============================================================

-- user_exposures: 자기 것만 CRUD
ALTER TABLE user_exposures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exposures_select_own"
  ON user_exposures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "exposures_insert_own"
  ON user_exposures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exposures_update_own"
  ON user_exposures FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_clicks: 자기 것만 SELECT/INSERT
ALTER TABLE user_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clicks_select_own"
  ON user_clicks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "clicks_insert_own"
  ON user_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- idioms: 누구나 읽기 가능
ALTER TABLE idioms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idioms_select_all"
  ON idioms FOR SELECT
  USING (true);
