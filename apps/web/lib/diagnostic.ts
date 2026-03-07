/**
 * 진단 테스트 알고리즘 v2
 *
 * 급수별 10문제씩 순차 출제
 * 결과: 급수별 점수만 표시 (8/10, 5/10 등)
 * 급수 판단은 유저 몫
 */

import rawQuestions from '@/data/diagnostic-questions.json';

// --- 타입 ---

export type QuestionType = 'reading' | 'huneum' | 'antonym' | 'meaning' | 'idiom';

export interface DiagnosticQuestion {
  id: string;
  level: number;
  type: QuestionType;
  question: string;
  answer: string;
  choices: string[];
  hint?: string;       // 사자성어 힌트
  sentence?: string;   // 문장형 독음 문제 (한자어가 포함된 문장)
}

export interface AnswerRecord {
  questionId: string;
  level: number;
  type: QuestionType;
  correct: boolean;
}

export interface LevelScore {
  level: number;
  correct: number;
  total: number;
}

export interface DiagnosticState {
  selectedLevels: number[];
  questions: DiagnosticQuestion[];
  currentIndex: number;
  answers: AnswerRecord[];
  phase: 'intro' | 'quiz' | 'result';
}

// --- 상수 ---

const AVAILABLE_LEVELS = [8, 7, 6, 5, 4];

// --- 유틸 ---

/** 배열 셔플 (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** JSON에서 문제만 필터 (_comment 제외) */
function loadQuestions(): DiagnosticQuestion[] {
  return (rawQuestions as Record<string, unknown>[]).filter(
    (q) => 'id' in q && 'type' in q,
  ) as unknown as DiagnosticQuestion[];
}

// --- 핵심 함수 ---

/** 사용 가능한 급수 목록 */
export function getAvailableLevels(): number[] {
  return AVAILABLE_LEVELS;
}

/** 초기 상태 생성 */
export function createInitialState(): DiagnosticState {
  return {
    selectedLevels: [],
    questions: [],
    currentIndex: 0,
    answers: [],
    phase: 'intro',
  };
}

/** 선택한 급수의 문제 준비 (각 급수 내에서 셔플, 선택지도 셔플) */
export function prepareQuestions(levels: number[]): DiagnosticQuestion[] {
  const allQuestions = loadQuestions();
  const result: DiagnosticQuestion[] = [];

  // 급수 순서: 쉬운 것(8)부터
  const sortedLevels = [...levels].sort((a, b) => b - a);

  for (const level of sortedLevels) {
    const levelQuestions = allQuestions.filter((q) => q.level === level);
    const shuffled = shuffle(levelQuestions).map((q) => ({
      ...q,
      choices: shuffle(q.choices),
    }));
    result.push(...shuffled);
  }

  return result;
}

/** 테스트 시작 */
export function startTest(
  state: DiagnosticState,
  levels: number[],
): DiagnosticState {
  const questions = prepareQuestions(levels);
  return {
    selectedLevels: levels,
    questions,
    currentIndex: 0,
    answers: [],
    phase: 'quiz',
  };
}

/** 답변 처리 */
export function processAnswer(
  state: DiagnosticState,
  correct: boolean,
): DiagnosticState {
  const current = state.questions[state.currentIndex];
  const newAnswers: AnswerRecord[] = [
    ...state.answers,
    {
      questionId: current.id,
      level: current.level,
      type: current.type,
      correct,
    },
  ];

  const nextIndex = state.currentIndex + 1;
  const isComplete = nextIndex >= state.questions.length;

  return {
    ...state,
    answers: newAnswers,
    currentIndex: isComplete ? state.currentIndex : nextIndex,
    phase: isComplete ? 'result' : 'quiz',
  };
}

/** 현재 문제 가져오기 */
export function getCurrentQuestion(
  state: DiagnosticState,
): DiagnosticQuestion | null {
  if (state.phase !== 'quiz') return null;
  return state.questions[state.currentIndex] ?? null;
}

/** 급수별 점수 계산 */
export function getLevelScores(answers: AnswerRecord[]): LevelScore[] {
  const map = new Map<number, { correct: number; total: number }>();

  for (const a of answers) {
    const stats = map.get(a.level) || { correct: 0, total: 0 };
    stats.total++;
    if (a.correct) stats.correct++;
    map.set(a.level, stats);
  }

  return Array.from(map.entries())
    .map(([level, stats]) => ({ level, ...stats }))
    .sort((a, b) => b.level - a.level);
}

/** 급수 표시 문자열 */
export function getLevelLabel(level: number): string {
  if (level === 0) return '특급';
  return `${level}급`;
}

/** 문제 유형별 지시문 */
export function getTypeInstruction(type: QuestionType): string {
  switch (type) {
    case 'reading': return '밑줄 친 한자어의 읽는 소리는?';
    case 'huneum': return '다음 한자의 훈(뜻)과 음(소리)은?';
    case 'antonym': return '다음 한자의 반대(상대) 글자는?';
    case 'meaning': return '다음 한자어의 뜻은?';
    case 'idiom': return '빈칸에 들어갈 한자는?';
  }
}
