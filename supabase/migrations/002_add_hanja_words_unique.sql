-- hanja_words: korean_word + hanja 조합에 unique constraint 추가
-- upsert (중복 방지)를 위해 필요
-- 기존 idx_hanja_word_pair 인덱스를 unique로 교체

DROP INDEX IF EXISTS idx_hanja_word_pair;

CREATE UNIQUE INDEX idx_hanja_word_pair
  ON hanja_words(korean_word, hanja);
