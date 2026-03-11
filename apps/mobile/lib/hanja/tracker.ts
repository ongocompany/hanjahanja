/**
 * 모바일용 한자 노출/클릭 추적
 * AsyncStorage 기반, 익스텐션 tracker.ts와 동일한 데이터 구조
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── 키 상수 ──
const KEY_TODAY_EXPOSURES = 'hj_todayExposures';
const KEY_TODAY_CLICKS = 'hj_todayClicks';
const KEY_VOCAB = 'hj_vocabulary';
const KEY_LAST_DATE = 'hj_lastDate';

// ── 노출 추적 ──
// 메모리 버퍼 (성능, 30초마다 flush)
let exposureBuffer: Record<string, number> = {};
let flushTimer: ReturnType<typeof setInterval> | null = null;

/** 노출 기록 (word|hanja 키) */
export function trackExposure(word: string, hanja: string) {
  const key = `${word}|${hanja}`;
  exposureBuffer[key] = (exposureBuffer[key] || 0) + 1;
}

/** 메모리 버퍼 → AsyncStorage 저장 */
export async function flushExposures() {
  if (Object.keys(exposureBuffer).length === 0) return;

  try {
    const raw = await AsyncStorage.getItem(KEY_TODAY_EXPOSURES);
    const stored: Record<string, number> = raw ? JSON.parse(raw) : {};

    for (const [key, count] of Object.entries(exposureBuffer)) {
      stored[key] = (stored[key] || 0) + count;
    }

    await AsyncStorage.setItem(KEY_TODAY_EXPOSURES, JSON.stringify(stored));
    exposureBuffer = {};
  } catch (error) {
    console.warn('노출 데이터 저장 실패:', error);
  }
}

/** 자동 flush 시작 (30초 간격) */
export function startAutoFlush() {
  if (flushTimer) return;
  flushTimer = setInterval(flushExposures, 30000);
}

/** 자동 flush 중지 */
export function stopAutoFlush() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  // 마지막 flush
  flushExposures();
}

// ── 클릭 추적 ──

export interface ClickRecord {
  word: string;
  hanja: string;
  meaning: string;
  sourceUrl: string;
  ts: number;
}

/** 클릭(탭) 기록 */
export async function trackClick(
  word: string,
  hanja: string,
  meaning: string,
  sourceUrl: string,
) {
  try {
    const raw = await AsyncStorage.getItem(KEY_TODAY_CLICKS);
    const clicks: ClickRecord[] = raw ? JSON.parse(raw) : [];

    clicks.push({
      word,
      hanja,
      meaning,
      sourceUrl,
      ts: Date.now(),
    });

    await AsyncStorage.setItem(KEY_TODAY_CLICKS, JSON.stringify(clicks));
  } catch (error) {
    console.warn('클릭 데이터 저장 실패:', error);
  }
}

// ── 단어장 ──

export interface VocabItem {
  word: string;
  hanja: string;
  meaning: string;
  addedAt: number;
}

/** 단어장에 추가 */
export async function addToVocab(word: string, hanja: string, meaning: string) {
  try {
    const raw = await AsyncStorage.getItem(KEY_VOCAB);
    const vocab: VocabItem[] = raw ? JSON.parse(raw) : [];

    // 중복 체크
    if (vocab.some((v) => v.word === word && v.hanja === hanja)) return;

    vocab.push({ word, hanja, meaning, addedAt: Date.now() });
    await AsyncStorage.setItem(KEY_VOCAB, JSON.stringify(vocab));
  } catch (error) {
    console.warn('단어장 저장 실패:', error);
  }
}

/** 단어장 조회 */
export async function getVocab(): Promise<VocabItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_VOCAB);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 오늘 노출 데이터 조회 */
export async function getTodayExposures(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TODAY_EXPOSURES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** 오늘 클릭 데이터 조회 */
export async function getTodayClicks(): Promise<ClickRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TODAY_CLICKS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 날짜 변경 시 데이터 로테이션 (today → yesterday) */
export async function rotateDailyData() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = await AsyncStorage.getItem(KEY_LAST_DATE);

    if (lastDate && lastDate !== today) {
      // 어제 데이터로 이동 (나중에 Supabase 동기화에 사용)
      const exposures = await AsyncStorage.getItem(KEY_TODAY_EXPOSURES);
      const clicks = await AsyncStorage.getItem(KEY_TODAY_CLICKS);

      if (exposures) {
        await AsyncStorage.setItem('hj_yesterdayExposures', exposures);
      }
      if (clicks) {
        await AsyncStorage.setItem('hj_yesterdayClicks', clicks);
      }

      // 오늘 데이터 초기화
      await AsyncStorage.removeItem(KEY_TODAY_EXPOSURES);
      await AsyncStorage.removeItem(KEY_TODAY_CLICKS);
    }

    await AsyncStorage.setItem(KEY_LAST_DATE, today);
  } catch (error) {
    console.warn('날짜 로테이션 실패:', error);
  }
}
