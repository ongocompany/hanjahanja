/**
 * WSD (동음이의어 판별) API 클라이언트
 *
 * background script를 통해 jinserver WSD API를 호출한다.
 * (HTTPS 페이지에서 HTTP API 직접 호출 시 Mixed Content 차단되므로 background 프록시 사용)
 */

/** WSD API 사용 가능 여부 */
let apiAvailable = false;
let initChecked = false;

/** WSD 초기화 — background를 통해 API 서버 헬스체크 */
export async function initWSD(): Promise<boolean> {
  if (initChecked) return apiAvailable;
  initChecked = true;

  try {
    const res = await browser.runtime.sendMessage({ type: 'wsd-health' });
    if (res?.ok && res.data?.model_loaded === true) {
      apiAvailable = true;
      console.log(`[한자한자 WSD] API 서버 연결 (${res.data.heads}개 헤드, ${res.data.default_sense ?? 0}개 대표뜻)`);
    }
  } catch {
    console.log('[한자한자 WSD] API 서버 미연결 (폴백 모드)');
    apiAvailable = false;
  }

  return apiAvailable;
}

/** WSD API가 사용 가능한지 확인 */
export function hasWSDHead(_word: string): boolean {
  return apiAvailable;
}

/**
 * 배치 WSD 한자 예측 — background를 통해 API 호출
 */
export async function predictHanjaBatch(
  sentence: string,
  words: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  if (!apiAvailable || words.length === 0) return results;

  try {
    const res = await browser.runtime.sendMessage({
      type: 'wsd-predict',
      sentence,
      words,
    });

    if (res?.ok && res.data?.results) {
      for (const [word, hanja] of Object.entries(res.data.results)) {
        results.set(word, hanja as string | null);
      }
    }
  } catch {
    // API 실패 시 빈 결과 반환 (폴백)
  }

  return results;
}

/**
 * 단일 단어 WSD 한자 예측
 */
export async function predictHanja(sentence: string, word: string): Promise<string | null> {
  const results = await predictHanjaBatch(sentence, [word]);
  return results.get(word) ?? null;
}
