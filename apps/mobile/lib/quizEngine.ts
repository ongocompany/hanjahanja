/**
 * 퀴즈 엔진 — 데이터 로딩 + 문제 생성 로직
 */

// --- 타입 ---
export interface CharInfo {
  char: string;
  reading: string;
  meaning: string;
  level: number;
}

export interface QuizWord {
  word: string;
  hanja: string;
  meaning: string;
  level: number;
  chars: CharInfo[];
  source?: string;
}

export interface Idiom {
  word: string;
  hanja: string;
  meaning: string;
  level: number;
  chars: CharInfo[];
}

export interface WritingChar {
  char: string;
  reading: string;
  meaning: string;
  level: number;
  radical: string;
  stroke_count: number;
}

export interface RadicalChar {
  char: string;
  reading: string;
  meaning: string;
  level: number;
  radical: string;
  stroke_count: number;
}

export interface WordQuestion {
  type: 'word';
  word: string;
  hanja: string;
  meaning: string;
  options: string[];     // 4개 한자 보기
  correctIndex: number;
  chars: CharInfo[];
}

export interface IdiomQuestion {
  type: 'idiom';
  word: string;
  hanja: string;
  meaning: string;
  chars: CharInfo[];
  blankIndices: number[];       // 빈칸 위치 (0~3)
  charOptions: string[][];      // 각 빈칸별 4개 보기
  correctChars: string[];       // 각 빈칸의 정답
}

export interface WritingQuestion {
  type: 'writing';
  char: string;
  reading: string;
  meaning: string;
  hint: string;  // "맑을 청"
}

// --- 데이터 로딩 ---
const quizWordsData: QuizWord[] = require('../data/quiz-words.json');
const idiomsData: Idiom[] = require('../data/idioms.json');
const writingCharsData: WritingChar[] = require('../data/writing-chars.json');
const radicalGroupsData: Record<string, RadicalChar[]> = require('../data/radical-groups.json');

// --- 유틸 ---
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

// --- 단어 퀴즈 생성 ---
export function generateWordQuestions(level: number = 8, count: number = 10): WordQuestion[] {
  // 해당 레벨 ± 1 범위 단어 풀
  const pool = quizWordsData.filter(w => Math.abs(w.level - level) <= 1);
  if (pool.length < 4) return [];

  const selected = pickRandom(pool, count);
  return selected.map(q => {
    // 오답 생성: 같은 풀에서 다른 한자 3개
    const others = pool.filter(w => w.hanja !== q.hanja);
    const wrongOptions = pickRandom(others, 3).map(w => w.hanja);
    const options = shuffle([q.hanja, ...wrongOptions]);

    return {
      type: 'word' as const,
      word: q.word,
      hanja: q.hanja,
      meaning: q.meaning,
      options,
      correctIndex: options.indexOf(q.hanja),
      chars: q.chars,
    };
  });
}

// --- 사자성어 퀴즈 생성 ---
export function generateIdiomQuestions(level: number = 8, count: number = 5): IdiomQuestion[] {
  const pool = idiomsData.filter(i => Math.abs(i.level - level) <= 2);
  if (pool.length < 2) return [];

  const selected = pickRandom(pool, count);
  return selected.map(idiom => {
    // 1~2개 빈칸
    const numBlanks = Math.random() > 0.5 ? 2 : 1;
    const allIndices = shuffle([0, 1, 2, 3]);
    const blankIndices = allIndices.slice(0, numBlanks);

    const charOptions: string[][] = [];
    const correctChars: string[] = [];

    for (const bi of blankIndices) {
      const correct = idiom.hanja[bi];
      correctChars.push(correct);

      // 오답: 같은 레벨 범위의 다른 한자들
      const otherChars = pool
        .flatMap(i => i.hanja.split(''))
        .filter(c => c !== correct);
      const uniqueOthers = [...new Set(otherChars)];
      const wrong = pickRandom(uniqueOthers, 3);
      charOptions.push(shuffle([correct, ...wrong]));
    }

    return {
      type: 'idiom' as const,
      word: idiom.word,
      hanja: idiom.hanja,
      meaning: idiom.meaning,
      chars: idiom.chars,
      blankIndices,
      charOptions,
      correctChars,
    };
  });
}

// --- 쓰기 퀴즈 생성 ---
export function generateWritingQuestions(level: number = 8, count: number = 5): WritingQuestion[] {
  const pool = writingCharsData.filter(c => Math.abs(c.level - level) <= 1);
  if (pool.length === 0) return [];

  const selected = pickRandom(pool, count);
  return selected.map(c => ({
    type: 'writing' as const,
    char: c.char,
    reading: c.reading,
    meaning: c.meaning,
    hint: `${c.meaning} ${c.reading}`,
  }));
}

// --- 꼬리물기 체인 생성 ---
export interface RadicalChainNode {
  char: string;
  reading: string;
  meaning: string;
  radical: string;
}

export function generateRadicalChain(startLevel: number = 8, chainLength: number = 5): RadicalChainNode[] {
  // 시작 한자 선택 (해당 레벨 범위)
  const startPool = writingCharsData.filter(c =>
    Math.abs(c.level - startLevel) <= 1 && c.radical
  );
  if (startPool.length === 0) return [];

  const chain: RadicalChainNode[] = [];
  const usedChars = new Set<string>();

  // 시작 한자
  const start = startPool[Math.floor(Math.random() * startPool.length)];
  chain.push({
    char: start.char,
    reading: start.reading,
    meaning: start.meaning,
    radical: start.radical,
  });
  usedChars.add(start.char);

  // 체인 이어가기: 현재 한자의 부수로 다음 한자 선택
  let currentRadical = start.radical;

  for (let i = 1; i < chainLength; i++) {
    const group = radicalGroupsData[currentRadical];
    if (!group) break;

    const candidates = group.filter(c => !usedChars.has(c.char));
    if (candidates.length === 0) break;

    const next = candidates[Math.floor(Math.random() * candidates.length)];
    chain.push({
      char: next.char,
      reading: next.reading,
      meaning: next.meaning,
      radical: next.radical,
    });
    usedChars.add(next.char);

    // 다음 부수로 전환 (다른 부수 한자가 있으면 그쪽으로)
    if (next.radical !== currentRadical && radicalGroupsData[next.radical]) {
      currentRadical = next.radical;
    }
  }

  return chain;
}

// --- 부수별 한자 목록 조회 ---
export function getCharsByRadical(radical: string): RadicalChar[] {
  return radicalGroupsData[radical] || [];
}

// --- 전체 부수 목록 ---
export function getAllRadicals(): string[] {
  return Object.keys(radicalGroupsData);
}
