/**
 * 사용자 한자 선호도 관리
 * 동음이의어 중 사용자가 자주 선택한 한자를 우선 표시
 *
 * 저장 구조: { hanjaPrefs: { "경제": { "經濟": 5, "輕齊": 1 }, ... } }
 */

const STORAGE_KEY = 'hanjaPrefs';

type PrefsMap = Record<string, Record<string, number>>;

let cache: PrefsMap | null = null;

/** 저장된 선호도 전체 로드 */
async function loadPrefs(): Promise<PrefsMap> {
  if (cache) return cache;
  const result = await chrome.storage.local.get(STORAGE_KEY);
  cache = (result[STORAGE_KEY] as PrefsMap) ?? {};
  return cache;
}

/** 특정 단어의 한자 선택 횟수 기록 */
export async function recordChoice(word: string, hanja: string): Promise<void> {
  const prefs = await loadPrefs();
  if (!prefs[word]) prefs[word] = {};
  prefs[word][hanja] = (prefs[word][hanja] ?? 0) + 1;
  cache = prefs;
  await chrome.storage.local.set({ [STORAGE_KEY]: prefs });
}

/** 특정 단어의 한자별 선택 횟수 조회 (없으면 빈 객체) */
export async function getWordPrefs(word: string): Promise<Record<string, number>> {
  const prefs = await loadPrefs();
  return prefs[word] ?? {};
}

/** 선호도 캐시 초기화 (설정 변경 시) */
export function clearPrefsCache(): void {
  cache = null;
}
