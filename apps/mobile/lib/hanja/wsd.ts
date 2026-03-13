/**
 * WSD (동음이의어 판별) API 클라이언트 — 모바일용
 *
 * Expo에서는 직접 fetch 가능 (브라우저 Mixed Content 제한 없음)
 * 익스텐션과 달리 background proxy 불필요
 */

const WSD_API_URL = 'https://hanjahanja.co.kr/api';
const HEALTH_TIMEOUT = 3000;
const PREDICT_TIMEOUT = 5000;

/** WSD API 사용 가능 여부 */
let apiAvailable = false;
let initChecked = false;

/** WSD 초기화 — API 서버 헬스체크 */
export async function initWSD(): Promise<boolean> {
  if (initChecked) return apiAvailable;
  initChecked = true;

  try {
    const res = await fetch(`${WSD_API_URL}/wsd-health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    if (data?.status === 'ok' && data?.model_loaded === true) {
      apiAvailable = true;
      console.log(`[WSD] API 연결 (${data.heads}개 헤드)`);
    }
  } catch {
    console.log('[WSD] API 미연결 (폴백: 빈도 기반)');
    apiAvailable = false;
  }

  return apiAvailable;
}

/** WSD API 사용 가능한지 */
export function isWSDAvailable(): boolean {
  return apiAvailable;
}

/** 초기화 상태 리셋 (재연결 시도용) */
export function resetWSD() {
  initChecked = false;
  apiAvailable = false;
}

/**
 * 배치 WSD 한자 예측
 * @param sentence 원문 문장 (문맥)
 * @param words 동음이의어 단어 목록
 * @returns word → 예측 한자 매핑
 */
export async function predictHanjaBatch(
  sentence: string,
  words: string[],
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  if (!apiAvailable || words.length === 0) return results;

  try {
    const res = await fetch(`${WSD_API_URL}/wsd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence, words }),
      signal: AbortSignal.timeout(PREDICT_TIMEOUT),
    });

    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();

    if (data?.results) {
      for (const [word, hanja] of Object.entries(data.results)) {
        results.set(word, hanja as string | null);
      }
    }
  } catch {
    // API 실패 시 빈 결과 → 빈도 기반 폴백
  }

  return results;
}

/** 단일 단어 WSD 예측 */
export async function predictHanja(
  sentence: string,
  word: string,
): Promise<string | null> {
  const results = await predictHanjaBatch(sentence, [word]);
  return results.get(word) ?? null;
}
