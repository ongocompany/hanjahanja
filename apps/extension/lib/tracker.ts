/**
 * 노출/클릭 추적 모듈
 *
 * - trackExposure(): 한자 노출 시 메모리 버퍼에 누적 → 주기적으로 chrome.storage flush
 * - trackClick(): 클릭 시 즉시 chrome.storage에 기록
 * - 날짜 변경 시 자동 rotate (오늘→어제)
 */

const EXPOSURE_KEY = 'todayExposures';
const CLICK_KEY = 'todayClicks';
const YESTERDAY_EXPOSURE_KEY = 'yesterdayExposures';
const YESTERDAY_CLICK_KEY = 'yesterdayClicks';
const DATE_KEY = 'trackingDate';
const FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5분

/** 노출 버퍼: "경제|經濟" → count */
const exposureBuffer = new Map<string, number>();

/** 오늘 날짜 문자열 (YYYY-MM-DD) */
function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 날짜가 바뀌었으면 오늘 데이터를 어제로 이동 */
async function rotateDateIfNeeded(): Promise<void> {
  const result = await browser.storage.local.get([DATE_KEY, EXPOSURE_KEY, CLICK_KEY]);
  const storedDate = result[DATE_KEY] as string | undefined;
  const today = todayString();

  if (storedDate && storedDate !== today) {
    // 오늘 → 어제로 이동
    await browser.storage.local.set({
      [YESTERDAY_EXPOSURE_KEY]: result[EXPOSURE_KEY] ?? {},
      [YESTERDAY_CLICK_KEY]: result[CLICK_KEY] ?? [],
      [EXPOSURE_KEY]: {},
      [CLICK_KEY]: [],
      [DATE_KEY]: today,
    });
    exposureBuffer.clear();
  } else if (!storedDate) {
    await browser.storage.local.set({ [DATE_KEY]: today });
  }
}

/** 메모리 버퍼를 chrome.storage로 flush */
async function flushExposures(): Promise<void> {
  if (exposureBuffer.size === 0) return;

  const result = await browser.storage.local.get(EXPOSURE_KEY);
  const stored = (result[EXPOSURE_KEY] as Record<string, number>) ?? {};

  for (const [key, count] of exposureBuffer.entries()) {
    stored[key] = (stored[key] ?? 0) + count;
  }

  await browser.storage.local.set({ [EXPOSURE_KEY]: stored });
  exposureBuffer.clear();
}

/** 노출 추적 — 메모리 버퍼에 누적 (가벼움) */
export function trackExposure(word: string, hanja: string): void {
  const key = `${word}|${hanja}`;
  exposureBuffer.set(key, (exposureBuffer.get(key) ?? 0) + 1);
}

/** 클릭 추적 — 즉시 chrome.storage에 기록 */
export async function trackClick(
  word: string,
  hanja: string,
  contextSentence?: string,
  sourceUrl?: string,
): Promise<void> {
  const result = await browser.storage.local.get(CLICK_KEY);
  const clicks = (result[CLICK_KEY] as Array<Record<string, unknown>>) ?? [];

  clicks.push({
    word,
    hanja,
    contextSentence: contextSentence ?? null,
    sourceUrl: sourceUrl ?? location.href,
    ts: Date.now(),
  });

  await browser.storage.local.set({ [CLICK_KEY]: clicks });
}

/** 오늘 노출 데이터 조회 (팝업용) */
export async function getTodayExposures(): Promise<Record<string, number>> {
  await flushExposures(); // 최신 데이터 반영
  const result = await browser.storage.local.get(EXPOSURE_KEY);
  return (result[EXPOSURE_KEY] as Record<string, number>) ?? {};
}

/** 오늘 클릭 데이터 조회 (팝업용) */
export async function getTodayClicks(): Promise<Array<Record<string, unknown>>> {
  const result = await browser.storage.local.get(CLICK_KEY);
  return (result[CLICK_KEY] as Array<Record<string, unknown>>) ?? [];
}

/** 어제 노출 데이터 조회 */
export async function getYesterdayExposures(): Promise<Record<string, number>> {
  const result = await browser.storage.local.get(YESTERDAY_EXPOSURE_KEY);
  return (result[YESTERDAY_EXPOSURE_KEY] as Record<string, number>) ?? {};
}

/** 어제 클릭 데이터 조회 */
export async function getYesterdayClicks(): Promise<Array<Record<string, unknown>>> {
  const result = await browser.storage.local.get(YESTERDAY_CLICK_KEY);
  return (result[YESTERDAY_CLICK_KEY] as Array<Record<string, unknown>>) ?? [];
}

/** 초기화: 날짜 체크 + 주기적 flush 시작 */
export async function initTracker(): Promise<void> {
  await rotateDateIfNeeded();

  // 5분마다 flush
  setInterval(flushExposures, FLUSH_INTERVAL_MS);

  // 탭 비활성화 시 flush
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushExposures();
    }
  });

  // 페이지 언로드 시 flush
  window.addEventListener('beforeunload', () => {
    flushExposures();
  });
}
