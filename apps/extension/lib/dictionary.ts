interface CharDetail {
  char: string;
  meaning: string;
  reading: string;
  level: number;
}

export interface DictEntry {
  hanja: string;
  reading: string;
  meaning: string;
  level: number;
  source: string;
  chars: CharDetail[];
}

export type HanjaDict = Record<string, DictEntry[]>;

const LEVEL_VALUES = [8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0];

let cachedDict: HanjaDict | null = null;

export async function loadDict(): Promise<HanjaDict> {
  if (cachedDict) return cachedDict;

  // 전체 급수 로드 (툴팁에서 모든 동음이의어를 보여주기 위해)
  const levelsToLoad = LEVEL_VALUES;
  const merged: HanjaDict = {};

  const results = await Promise.allSettled(
    levelsToLoad.map(async (lv) => {
      const url = chrome.runtime.getURL(`dict/level-${lv}.json`);
      console.log(`[한자한자] 사전 로드 중: ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[한자한자] 사전 로드 실패: ${url} (${res.status})`);
        return null;
      }
      return res.json() as Promise<HanjaDict>;
    })
  );

  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    const dict = result.value;
    for (const [word, entries] of Object.entries(dict)) {
      if (!merged[word]) {
        merged[word] = entries;
      } else {
        const existingHanjas = new Set(merged[word].map((e) => e.hanja));
        for (const entry of entries) {
          if (!existingHanjas.has(entry.hanja)) {
            merged[word].push(entry);
          }
        }
      }
    }
  }

  cachedDict = merged;
  console.log(`[한자한자] 사전 로드 완료: ${Object.keys(merged).length.toLocaleString()}개 단어 (전체)`);
  return merged;
}

export function clearCache(): void {
  cachedDict = null;
}
