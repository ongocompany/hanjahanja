/**
 * 모바일용 한자 매칭 엔진
 * MeCab 없이 사전 기반 최장일치 매칭
 */

import type { HanjaDict, HomonymFreq, DictEntry } from './dictionary';

/** 매칭 결과 */
export interface MatchResult {
  word: string;         // 원문 한글
  hanja: string;        // 대표 한자
  meaning: string;      // 뜻
  reading: string;      // 음
  level: number;        // 급수
  startIdx: number;     // 원문 내 시작 위치
  endIdx: number;       // 원문 내 끝 위치
  entries: SimplifiedEntry[];  // 모든 동음이의어 엔트리
}

export interface SimplifiedEntry {
  hanja: string;
  meaning: string;
  reading: string;
  level: number;
  freq: number;  // 빈도 점수
}

/** 순우리말 차단 목록 (익스텐션과 동일) */
const NATIVE_KOREAN_BLOCKLIST = new Set([
  '우리', '너희', '여기', '거기', '어디', '이리', '저리',
  '서로', '다시', '미리', '모두',
  '아버지', '어머니', '오빠', '언니', '누나', '아기', '아우', '사위',
  '머리', '허리', '이마',
  '바다', '바람', '노을', '서리', '이슬',
  '여우', '오리', '개미', '모기', '거미', '하마',
  '고추', '감자', '배추', '가지', '열매', '보리', '가루', '고기', '무우',
  '가위', '호미', '수저', '비누', '고리',
  '하나', '마리',
  '사이', '여보', '나라', '아이', '소리', '나이',
  '자리', '무리', '누리', '노래', '이루', '어리',
  '가리', '도리', '수리', '구리', '부리',
  '모습', '거리', '사내', '재미', '나중', '사랑',
  '서울', '통사',
  '가사리', '갈매', '감다', '개암', '개울', '건지', '고마리', '곤두',
  '구기다', '기화리', '다미', '도담', '도막', '동거리', '두가리', '두두',
  '두순', '두어', '둔덕', '마련', '마루', '만도리', '모도리', '모로',
  '모로리', '무수다', '무수리', '문척', '미사리', '발랑', '방아', '보라',
  '비역', '빈지', '사마치', '사치기', '살미', '삼부리', '삼사미', '상막',
  '상수리', '소래', '수리치', '슬치', '시루', '신주부', '아서', '양판',
  '어우리', '여치', '역삼', '염통', '오가리', '오사리', '왕창', '울대',
  '이응', '자게', '자두', '장도리', '장만', '정엽', '지가리', '지화리',
  '차랑', '초고리', '초고지', '추근', '칠봉', '팔랑', '피륙', '회창',
]);

/** 최소 변환 빈도 (빈도 데이터 기준) */
const MIN_CONVERT_FREQ = 7;

/** 한글 음절 범위 체크 */
function isKorean(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0xAC00 && code <= 0xD7A3;
}

/**
 * 사전 단어 키로 Trie 빌드 (빠른 최장일치 검색용)
 */
export function buildWordSet(dict: HanjaDict): Set<string> {
  return new Set(Object.keys(dict));
}

/**
 * 텍스트에서 한자어 매칭 (최장일치)
 */
export function findMatches(
  text: string,
  dict: HanjaDict,
  wordSet: Set<string>,
  homonymFreq: HomonymFreq,
  maxWordLen: number = 6,
): MatchResult[] {
  const results: MatchResult[] = [];
  let i = 0;

  while (i < text.length) {
    // 한글이 아니면 스킵
    if (!isKorean(text[i])) {
      i++;
      continue;
    }

    // 최장일치: 긴 것부터 시도
    let matched = false;
    const maxLen = Math.min(maxWordLen, text.length - i);

    for (let len = maxLen; len >= 2; len--) {
      const candidate = text.substring(i, i + len);

      // 블록리스트 체크
      if (NATIVE_KOREAN_BLOCKLIST.has(candidate)) continue;

      // 사전에 있는지 확인
      if (!wordSet.has(candidate)) continue;

      const entries = dict[candidate];
      if (!entries || entries.length === 0) continue;

      // 한 글자 단어 스킵 (오변환 위험)
      if (candidate.length === 1) continue;

      // 빈도 기반 정렬
      const freq = homonymFreq[candidate] || {};
      const sorted = sortEntries(entries, freq);

      // 최소 빈도 체크 (빈도 데이터가 있을 때만)
      const topEntry = sorted[0];
      const topFreq = freq[topEntry.hanja] || 0;
      if (Object.keys(freq).length > 0 && topFreq < MIN_CONVERT_FREQ) {
        continue;
      }

      results.push({
        word: candidate,
        hanja: topEntry.hanja,
        meaning: topEntry.meaning,
        reading: topEntry.reading,
        level: topEntry.level,
        startIdx: i,
        endIdx: i + len,
        entries: sorted.map((e) => ({
          hanja: e.hanja,
          meaning: e.meaning,
          reading: e.reading,
          level: e.level,
          freq: freq[e.hanja] || 0,
        })),
      });

      i += len;
      matched = true;
      break;
    }

    if (!matched) {
      i++;
    }
  }

  return results;
}

/** 빈도 기반 엔트리 정렬 (높은 빈도 → 앞) */
function sortEntries(entries: DictEntry[], freq: Record<string, number>): DictEntry[] {
  return [...entries].sort((a, b) => {
    const fa = freq[a.hanja] || 0;
    const fb = freq[b.hanja] || 0;
    return fb - fa;
  });
}
