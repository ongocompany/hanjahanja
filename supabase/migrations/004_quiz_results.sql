-- ============================================================
-- 한자한자 Phase 1 - 퀴즈 결과 스키마
-- 정답/오답 기록 → 오답 재출제 + 학습 분석
-- ============================================================

CREATE TABLE user_quiz_results (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  korean_word TEXT NOT NULL,
  hanja TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  quiz_type TEXT NOT NULL DEFAULT 'exposure',  -- 'exposure' | 'click' | 'vocab'
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_user_word ON user_quiz_results(user_id, korean_word, hanja);
CREATE INDEX idx_quiz_user_wrong ON user_quiz_results(user_id, is_correct) WHERE is_correct = FALSE;
CREATE INDEX idx_quiz_user_date ON user_quiz_results(user_id, answered_at);

-- RLS: 자기 것만 CRUD
ALTER TABLE user_quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_select_own"
  ON user_quiz_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "quiz_insert_own"
  ON user_quiz_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);
