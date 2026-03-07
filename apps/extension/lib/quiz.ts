/**
 * 퀴즈 생성 모듈
 *
 * "다음 설명에 맞는 한자어는?" 방식
 * - 힌트: 사전의 meaning (뜻)
 * - 선택지: 한자만 표시 (한글 X)
 * - 오답: 동음이의어 우선, 부족하면 같은 글자수 다른 한자어로 보충
 */

import type { HanjaDict } from './dictionary';

export interface QuizQuestion {
  hint: string;        // 뜻 설명 (예: "재물을 잘 다스림")
  word: string;        // 정답 한글 (예: "경제") — 정답 확인용, UI에 안 보임
  hanja: string;       // 정답 한자 (예: "經濟")
  choices: string[];   // 4지선다 한자만 (셔플됨)
  type: 'exposure' | 'click';
}

/** 배열 셔플 (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 오답 한자 생성
 * 1순위: 동음이의어 (같은 읽기, 다른 한자) — 헷갈리게!
 * 2순위: 같은 글자수의 다른 한자어 — 보충용
 */
function generateWrongHanja(
  correctWord: string,
  correctHanja: string,
  dict: HanjaDict,
  count: number = 3,
): string[] {
  const wrong: string[] = [];
  const seen = new Set<string>();
  seen.add(correctHanja);

  // 1순위: 동음이의어 (같은 한글 단어의 다른 한자)
  const homonyms = dict[correctWord];
  if (homonyms) {
    for (const entry of homonyms) {
      if (!seen.has(entry.hanja)) {
        wrong.push(entry.hanja);
        seen.add(entry.hanja);
        if (wrong.length >= count) return shuffle(wrong);
      }
    }
  }

  // 2순위: 같은 글자수의 다른 한자어 (랜덤)
  const len = correctHanja.length;
  const candidates: string[] = [];

  for (const entries of Object.values(dict)) {
    for (const entry of entries) {
      if (!seen.has(entry.hanja) && entry.hanja.length === len) {
        candidates.push(entry.hanja);
        seen.add(entry.hanja);
      }
      if (candidates.length >= 50) break;
    }
    if (candidates.length >= 50) break;
  }

  const remaining = count - wrong.length;
  wrong.push(...shuffle(candidates).slice(0, remaining));

  return wrong;
}

/** 노출 데이터에서 퀴즈 생성 */
export function generateExposureQuiz(
  exposures: Record<string, number>,
  dict: HanjaDict,
  maxQuestions: number = 5,
): QuizQuestion[] {
  const sorted = Object.entries(exposures)
    .map(([key, count]) => {
      const [word, hanja] = key.split('|');
      return { word, hanja, count };
    })
    .sort((a, b) => b.count - a.count);

  const questions: QuizQuestion[] = [];

  for (const item of sorted) {
    if (questions.length >= maxQuestions) break;

    const entries = dict[item.word];
    const entry = entries?.find((e) => e.hanja === item.hanja);
    if (!entry?.meaning) continue;

    const wrongHanja = generateWrongHanja(item.word, item.hanja, dict);
    if (wrongHanja.length < 3) continue;

    questions.push({
      hint: entry.meaning,
      word: item.word,
      hanja: item.hanja,
      choices: shuffle([item.hanja, ...wrongHanja]),
      type: 'exposure',
    });
  }

  return questions;
}

/** 클릭 데이터에서 퀴즈 생성 */
export function generateClickQuiz(
  clicks: Array<Record<string, unknown>>,
  dict: HanjaDict,
  maxQuestions: number = 5,
): QuizQuestion[] {
  const seen = new Set<string>();
  const unique: { word: string; hanja: string }[] = [];

  for (const click of clicks) {
    const key = `${click.word}|${click.hanja}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ word: click.word as string, hanja: click.hanja as string });
    }
  }

  const questions: QuizQuestion[] = [];

  for (const item of unique) {
    if (questions.length >= maxQuestions) break;

    const entries = dict[item.word];
    const entry = entries?.find((e) => e.hanja === item.hanja);
    if (!entry?.meaning) continue;

    const wrongHanja = generateWrongHanja(item.word, item.hanja, dict);
    if (wrongHanja.length < 3) continue;

    questions.push({
      hint: entry.meaning,
      word: item.word,
      hanja: item.hanja,
      choices: shuffle([item.hanja, ...wrongHanja]),
      type: 'click',
    });
  }

  return questions;
}
