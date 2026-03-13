/**
 * 모바일용 한자 사전 로더
 * 번들 내장 (8~6급) + 서버 다운로드 (추가 급수)
 */

export interface CharInfo {
  char: string;
  reading: string;
  meaning: string;
  level: number;
}

export interface DictEntry {
  hanja: string;
  reading: string;
  meaning: string;
  level: number;
  source: string;
  chars: CharInfo[];
}

// word → DictEntry[] 매핑
export type HanjaDict = Record<string, DictEntry[]>;

// word → { hanja: frequency } 매핑
export type HomonymFreq = Record<string, Record<string, number>>;

// ── 번들 내장 사전 (8~6급, require로 동기 로드) ──
const BUNDLED_DICTS: Record<number, () => HanjaDict> = {
  8: () => require('@/assets/dict/level-8.json'),
  7.5: () => require('@/assets/dict/level-7.5.json'),
  7: () => require('@/assets/dict/level-7.json'),
  6.5: () => require('@/assets/dict/level-6.5.json'),
  6: () => require('@/assets/dict/level-6.json'),
};

// ── 상용 한자어 사전 (5.5급~특급 중 고빈도, compact 포맷) ──
// 비동음: "한자|뜻|급수", 동음: [["한자","뜻",급수], ...]
type CompactEntry = string | [string, string, number][];

/** compact 포맷 → DictEntry[] 변환 */
function parseCommonWords(raw: Record<string, CompactEntry>): HanjaDict {
  const result: HanjaDict = {};
  for (const [word, val] of Object.entries(raw)) {
    if (typeof val === 'string') {
      // 비동음: "한자|뜻|급수"
      const parts = val.split('|');
      result[word] = [{
        hanja: parts[0],
        reading: word,
        meaning: parts[1] || '',
        level: Number(parts[2]) || 5,
        source: 'common',
        chars: [],
      }];
    } else {
      // 동음: [["한자","뜻",급수], ...] (빈도순, 첫번째가 기본)
      result[word] = val.map(([hanja, meaning, level]) => ({
        hanja,
        reading: word,
        meaning: meaning || '',
        level: level || 5,
        source: 'common',
        chars: [],
      }));
    }
  }
  return result;
}

// 서버 URL (추가 급수 다운로드용, 나중에 배포 시 사용)
const DICT_BASE_URL = 'https://hanjahanja.co.kr/dict';

// 서버에서 로드할 급수 파일명
const REMOTE_LEVEL_FILES: Record<number, string> = {
  5.5: 'level-5.5.json',
  5: 'level-5.json',
  4.5: 'level-4.5.json',
  4: 'level-4.json',
  3.5: 'level-3.5.json',
  3: 'level-3.json',
  2: 'level-2.json',
  1.5: 'level-1.5.json',
  1: 'level-1.json',
  0.5: 'level-0.5.json',
  0: 'level-0.json',
};

// 캐시
let cachedDict: HanjaDict | null = null;
let cachedLevel: number | null = null;
let cachedFreq: HomonymFreq | null = null;

/** 사전 항목 합치기 */
function mergeDict(target: HanjaDict, source: HanjaDict) {
  for (const [word, entries] of Object.entries(source)) {
    if (target[word]) {
      target[word] = [...target[word], ...entries];
    } else {
      target[word] = entries;
    }
  }
}

/**
 * 지정 급수 범위의 사전 로드
 * @param maxLevel 사용자 급수 (이 숫자 이상만 로드, 숫자 클수록 쉬움)
 */
export async function loadDict(maxLevel: number = 8): Promise<HanjaDict> {
  if (cachedDict && cachedLevel === maxLevel) return cachedDict;

  const merged: HanjaDict = {};

  // 1. 번들 내장 사전 로드 (동기, 빠름)
  for (const [lvStr, loader] of Object.entries(BUNDLED_DICTS)) {
    const lv = Number(lvStr);
    if (lv >= maxLevel) {
      try {
        const dict = loader();
        mergeDict(merged, dict);
      } catch (error) {
        console.warn(`번들 사전 로드 실패 (${lv}급):`, error);
      }
    }
  }

  // 2. 상용 한자어 사전 로드 (5.5급~특급 고빈도, compact 포맷)
  // 6~8급 번들에 없는 일상 단어 커버 (대통령, 정치, 기업 등)
  try {
    const commonRaw = require('@/assets/dict/common-words.json');
    const commonDict = parseCommonWords(commonRaw);
    mergeDict(merged, commonDict);
    console.log(`상용 사전 로드: ${Object.keys(commonDict).length}단어`);
  } catch (error) {
    console.warn('상용 사전 로드 실패:', error);
  }

  // 3. 서버에서 추가 급수 로드 (비동기, 번들에 없는 것만)
  const remoteToLoad = Object.keys(REMOTE_LEVEL_FILES)
    .map(Number)
    .filter((lv) => lv >= maxLevel);

  if (remoteToLoad.length > 0) {
    const results = await Promise.allSettled(
      remoteToLoad.map(async (lv) => {
        const url = `${DICT_BASE_URL}/${REMOTE_LEVEL_FILES[lv]}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}`);
        return (await res.json()) as HanjaDict;
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        mergeDict(merged, result.value);
      }
      // 실패한 원격 급수는 무시 (번들에 없는 고급 사전)
    }
  }

  cachedDict = merged;
  cachedLevel = maxLevel;
  return merged;
}

/**
 * 동음이의어 빈도 데이터 로드
 */
export async function loadHomonymFreq(): Promise<HomonymFreq> {
  if (cachedFreq) return cachedFreq;

  // 번들 내장 시도
  try {
    cachedFreq = require('@/assets/dict/homonym-freq.json') as HomonymFreq;
    return cachedFreq;
  } catch {
    // 번들에 없으면 서버에서 로드
  }

  try {
    const url = `${DICT_BASE_URL}/homonym-freq.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    cachedFreq = (await res.json()) as HomonymFreq;
    return cachedFreq;
  } catch {
    cachedFreq = {};
    return cachedFreq;
  }
}

/** 캐시 초기화 */
export function clearCache() {
  cachedDict = null;
  cachedLevel = null;
  cachedFreq = null;
}
