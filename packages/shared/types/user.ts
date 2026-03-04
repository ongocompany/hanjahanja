/** 사용자 프로필 (profiles 테이블 대응) */
export interface UserProfile {
  id: string; // UUID
  nickname?: string;
  currentLevel: number; // 현재 한자 레벨 (8=가장 쉬움, 0=특급)
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 사용자 단어장 항목 (user_vocabulary 테이블 대응) */
export interface VocabularyItem {
  id: number;
  userId: string;
  wordId?: number;
  koreanWord: string;
  hanja: string;
  contextSentence?: string; // 단어가 포함된 원문 문장
  sourceUrl?: string; // 웹페이지 URL
  sourceTitle?: string; // 웹페이지 제목
  isMemorized: boolean; // 외웠는지 여부
  savedAt: string;
}

/** 진단 테스트 문제 */
export interface DiagnosticQuestion {
  id: number;
  questionText: string;
  questionType: "meaning" | "reading" | "hanja";
  correctAnswer: string;
  wrongAnswers: string[];
  targetLevel: number;
  difficulty: number;
}

/** 진단 테스트 결과 */
export interface DiagnosticResult {
  id: number;
  userId: string;
  assignedLevel: number;
  score: Record<string, number>; // 급수별 정답률
  takenAt: string;
}
