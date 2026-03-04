-- ============================================================
-- 한자한자 Phase 1 MVP - 초기 스키마
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ============================================================

-- ============================================================
-- 테이블 1: profiles (사용자 프로필)
-- Supabase Auth의 사용자 정보를 확장
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  current_level NUMERIC(3,1) DEFAULT 8,  -- 현재 한자 레벨 (8=가장 쉬움, 0=특급)
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 프로필 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 신규 유저 가입 시 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      '한자러버'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 테이블 2: hanja_characters (개별 한자 - PM 보유 데이터)
-- 어문회 급수별 개별 한자 목록. 급수 판정의 기준 원본.
-- ============================================================
CREATE TABLE hanja_characters (
  id SERIAL PRIMARY KEY,
  character TEXT NOT NULL UNIQUE,       -- 한자 1글자 (예: "經")
  reading TEXT NOT NULL,                -- 음 (예: "경")
  meaning TEXT NOT NULL,                -- 뜻 (예: "지날")
  level NUMERIC(3,1) NOT NULL,          -- 급수 (8, 7.5, 7, ... 0)
  level_label TEXT NOT NULL,            -- 급수 라벨 (예: "7급", "준7급")
  stroke_count INTEGER,                 -- 획수
  radical TEXT,                         -- 부수
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_hanja_char ON hanja_characters(character);
CREATE INDEX idx_hanja_char_level ON hanja_characters(level);
CREATE INDEX idx_hanja_char_reading ON hanja_characters(reading);

-- ============================================================
-- 테이블 3: hanja_words (한자어 매핑 사전 - 구축 필요)
-- 한글 단어 → 한자 변환 매핑. 크롬 확장의 사전 JSON 생성 원본.
-- ============================================================
CREATE TABLE hanja_words (
  id SERIAL PRIMARY KEY,
  korean_word TEXT NOT NULL,            -- 한글 단어 (예: "경제")
  hanja TEXT NOT NULL,                  -- 한자 표기 (예: "經濟")
  reading TEXT NOT NULL,                -- 음 (예: "경제")
  meaning TEXT,                         -- 뜻풀이
  word_level NUMERIC(3,1),              -- 단어 급수: 구성 한자 중 가장 어려운 급수
  word_level_label TEXT,                -- 급수 라벨 (예: "7급")
  char_details JSONB,                   -- 개별 한자 분해 정보
  source TEXT DEFAULT 'urimalsaem',     -- 데이터 출처
  frequency INTEGER DEFAULT 0,          -- 사용 빈도 (높을수록 자주 쓰임)
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 동일 한글 단어에 여러 한자 표기 가능 (예: 사기→詐欺, 사기→士氣)
CREATE INDEX idx_hanja_word_korean ON hanja_words(korean_word);
CREATE INDEX idx_hanja_word_level ON hanja_words(word_level);
CREATE INDEX idx_hanja_word_pair ON hanja_words(korean_word, hanja);
CREATE INDEX idx_hanja_word_verified ON hanja_words(is_verified) WHERE is_verified = true;

-- ============================================================
-- 테이블 4: user_vocabulary (사용자 단어장)
-- 우클릭으로 저장한 단어 + 문맥
-- ============================================================
CREATE TABLE user_vocabulary (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word_id INTEGER REFERENCES hanja_words(id),
  korean_word TEXT NOT NULL,
  hanja TEXT NOT NULL,
  context_sentence TEXT,                -- 단어가 포함된 원문 문장
  source_url TEXT,                      -- 출처 URL
  source_title TEXT,                    -- 출처 제목
  is_memorized BOOLEAN DEFAULT FALSE,
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vocab_user ON user_vocabulary(user_id);
CREATE INDEX idx_vocab_user_memorized ON user_vocabulary(user_id, is_memorized);

-- ============================================================
-- 테이블 5: diagnostic_questions (진단 테스트 문제)
-- 레벨 진단용 퀴즈 문제 풀
-- ============================================================
CREATE TABLE diagnostic_questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,          -- 문제 텍스트
  question_type TEXT NOT NULL,          -- 'meaning' | 'reading' | 'hanja'
  correct_answer TEXT NOT NULL,
  wrong_answers JSONB NOT NULL,         -- 오답 보기 배열
  target_level NUMERIC(3,1) NOT NULL,   -- 측정 급수
  difficulty INTEGER DEFAULT 1          -- 난이도 (1=쉬움, 3=어려움)
);

CREATE INDEX idx_diag_level ON diagnostic_questions(target_level);

-- ============================================================
-- 테이블 6: diagnostic_results (진단 테스트 결과)
-- 사용자의 진단 테스트 히스토리
-- ============================================================
CREATE TABLE diagnostic_results (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_level NUMERIC(3,1) NOT NULL, -- 판정된 레벨
  score JSONB,                          -- 급수별 정답률
  taken_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diag_results_user ON diagnostic_results(user_id);

-- ============================================================
-- RLS (Row Level Security) 정책
-- ============================================================

-- profiles: 자기 프로필만 읽기/수정
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- hanja_characters: 인증된 사용자 읽기 + 비로그인도 읽기 (진단테스트용)
ALTER TABLE hanja_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hanja_characters_select_all"
  ON hanja_characters FOR SELECT
  USING (true);

-- hanja_words: 인증된 사용자 읽기 + 비로그인도 읽기 (진단테스트용)
ALTER TABLE hanja_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hanja_words_select_all"
  ON hanja_words FOR SELECT
  USING (true);

-- user_vocabulary: 자기 단어장만 CRUD
ALTER TABLE user_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vocab_select_own"
  ON user_vocabulary FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "vocab_insert_own"
  ON user_vocabulary FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vocab_update_own"
  ON user_vocabulary FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vocab_delete_own"
  ON user_vocabulary FOR DELETE
  USING (auth.uid() = user_id);

-- diagnostic_questions: 누구나 읽기 (비로그인도 테스트 가능)
ALTER TABLE diagnostic_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diag_questions_select_all"
  ON diagnostic_questions FOR SELECT
  USING (true);

-- diagnostic_results: 자기 결과만 CRUD
ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diag_results_select_own"
  ON diagnostic_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "diag_results_insert_own"
  ON diagnostic_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "diag_results_delete_own"
  ON diagnostic_results FOR DELETE
  USING (auth.uid() = user_id);
