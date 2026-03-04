import type { DictEntry, HanjaDict } from './dictionary';

export interface HanjaMatch {
  word: string;
  entries: DictEntry[];
  position: number;
}

// 한자어로 변환할 품사 태그 (세종 품사 태그셋)
// NNG: 일반 명사, NNP: 고유 명사
const HANJA_POS_TAGS = new Set(['NNG', 'NNP']);

// kuromoji-ko 형태소 분석기 인스턴스
let mecabInstance: any = null;

export async function initMecab(): Promise<void> {
  if (mecabInstance) return;

  const dictPath = chrome.runtime.getURL('kuromoji-dict/');
  console.log(`[한자한자] 형태소 분석기 초기화 중... (${dictPath})`);

  const kuromoji = await import('kuromoji-ko');
  const MeCab = kuromoji.MeCab || (kuromoji as any).default?.MeCab;
  mecabInstance = await MeCab.create({ engine: 'ko', dictPath });
  console.log('[한자한자] 형태소 분석기 초기화 완료');
}

/**
 * 한자 읽기 검증: 개별 한자의 읽기를 합친 것이 원래 단어와 같은지 확인
 * "경제" → 經(경)+濟(제) = "경제" ✓
 * "이번" → 今(금)+番(번) = "금번" ≠ "이번" ✗
 */
function isValidHanjaReading(word: string, entry: DictEntry): boolean {
  if (!entry.chars || entry.chars.length === 0) return true;
  const charsReading = entry.chars.map((c) => c.reading).join('');
  return charsReading === word;
}

/**
 * 사전 엔트리에서 유효한 것만 필터링
 * 1. 한자 읽기가 원래 단어와 일치하는 것만
 * 2. 급수가 높은(쉬운) 엔트리를 우선 정렬
 */
function filterValidEntries(word: string, entries: DictEntry[]): DictEntry[] {
  return entries
    .filter((e) => isValidHanjaReading(word, e))
    .sort((a, b) => b.level - a.level); // 급수 높은(쉬운) 순 → 觀光(6) > 寬廣(3.5)
}

/**
 * 형태소 분석 기반 한자어 찾기
 * 1. kuromoji-ko로 형태소 분석
 * 2. NNG(일반명사)/NNP(고유명사) 토큰만 추출
 * 3. 연속된 명사는 합쳐서 한자 사전 매칭 (예: 경제 + 발전 → 경제발전)
 * 4. 한자 읽기 검증 + 동음이의어는 단일 매칭만 변환
 */
export function findHanjaWords(text: string, dict: HanjaDict): HanjaMatch[] {
  if (!mecabInstance) return [];

  const tokens = mecabInstance.parse(text);
  const matches: HanjaMatch[] = [];

  // 원문에서의 위치를 추적
  let cursor = 0;

  // 연속 명사 그룹을 모아서 처리
  let nounGroup: { surface: string; pos: string; startPos: number }[] = [];

  function tryMatch(word: string, startPos: number): boolean {
    const entries = dict[word];
    if (!entries) return false;

    const valid = filterValidEntries(word, entries);
    if (valid.length > 0) {
      matches.push({ word, entries: valid, position: startPos });
      return true;
    }
    return false;
  }

  function flushNounGroup() {
    if (nounGroup.length === 0) return;

    // 먼저 전체 합쳐서 사전 매칭 시도 (경제발전 → 經濟發展)
    if (nounGroup.length > 1) {
      const combined = nounGroup.map((n) => n.surface).join('');
      if (tryMatch(combined, nounGroup[0].startPos)) {
        nounGroup = [];
        return;
      }
    }

    // 전체 매칭 안 되면 개별 명사 매칭
    for (const noun of nounGroup) {
      tryMatch(noun.surface, noun.startPos);
    }

    nounGroup = [];
  }

  for (const token of tokens) {
    const surface: string = token.surface;
    const pos: string[] = token.pos;

    // 원문에서 이 토큰의 시작 위치 찾기
    const idx = text.indexOf(surface, cursor);
    const startPos = idx >= 0 ? idx : cursor;

    const isNoun = pos.some((p: string) => HANJA_POS_TAGS.has(p));

    if (isNoun && surface.length >= 2) {
      nounGroup.push({ surface, pos: pos[0], startPos });
    } else if (isNoun && surface.length === 1) {
      if (nounGroup.length > 0) {
        nounGroup.push({ surface, pos: pos[0], startPos });
      } else {
        flushNounGroup();
      }
    } else {
      flushNounGroup();
    }

    if (idx >= 0) {
      cursor = idx + surface.length;
    }
  }

  flushNounGroup();

  return matches;
}
