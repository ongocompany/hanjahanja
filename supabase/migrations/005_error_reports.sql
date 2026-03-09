-- 오변환 신고 테이블: 사용자가 잘못된 한자 변환을 신고하면 저장
-- 수집된 데이터는 WSD 모델 재학습에 활용
CREATE TABLE IF NOT EXISTS error_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  korean_word TEXT NOT NULL,           -- 원본 한글 단어 (예: "기사")
  predicted_hanja TEXT NOT NULL,       -- WSD가 예측한 한자 (예: "騎士")
  correct_hanja TEXT NOT NULL,         -- 사용자가 선택한 올바른 한자 (예: "記事")
  context_sentence TEXT,               -- 앞뒤 문맥 문장 (최대 500자)
  source_url TEXT,                     -- 페이지 URL
  reported_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;

-- 누구나 신고 가능 (비로그인도 INSERT 허용, user_id는 NULL)
CREATE POLICY "anyone_can_report" ON error_reports
  FOR INSERT WITH CHECK (true);

-- 본인 신고만 조회 가능 (로그인 사용자)
CREATE POLICY "users_read_own_reports" ON error_reports
  FOR SELECT USING (auth.uid() = user_id);

-- 인덱스: 단어별 신고 집계용
CREATE INDEX idx_error_reports_word ON error_reports (korean_word, predicted_hanja);
