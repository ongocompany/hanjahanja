/**
 * 모바일 Supabase 동기화 모듈
 *
 * AsyncStorage에 쌓인 WSD 교정 데이터를 Supabase error_reports에 업로드
 * - 비로그인도 가능 (RLS: anyone_can_report)
 * - 동기화 후 로컬 데이터 클리어
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './client';
import type { WSDCorrection } from '@/lib/hanja/tracker';

const KEY_WSD_CORRECTIONS = 'hj_wsdCorrections';
const KEY_LAST_SYNC = 'hj_lastWsdSync';

/** 현재 유저 ID (로그인 안 했으면 null) */
async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * WSD 교정 데이터를 Supabase error_reports에 동기화
 * @returns 동기화된 건수
 */
export async function syncWSDCorrections(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_WSD_CORRECTIONS);
    const corrections: WSDCorrection[] = raw ? JSON.parse(raw) : [];
    if (corrections.length === 0) return 0;

    const userId = await getUserId();

    // 50건씩 배치 INSERT
    let synced = 0;
    for (let i = 0; i < corrections.length; i += 50) {
      const batch = corrections.slice(i, i + 50).map((c) => ({
        user_id: userId,
        korean_word: c.word,
        predicted_hanja: c.originalHanja,
        correct_hanja: c.selectedHanja,
        context_sentence: c.sentence?.slice(0, 500) || null,
        source_url: null, // 모바일 브라우저 URL은 추후 추가 가능
      }));

      const { error } = await supabase.from('error_reports').insert(batch);
      if (!error) {
        synced += batch.length;
      } else {
        console.warn('[Sync] WSD 교정 업로드 실패:', error.message);
      }
    }

    // 동기화 성공한 만큼 로컬에서 제거
    if (synced >= corrections.length) {
      // 전부 성공 → 클리어
      await AsyncStorage.removeItem(KEY_WSD_CORRECTIONS);
    } else if (synced > 0) {
      // 일부 성공 → 남은 것만 보존
      const remaining = corrections.slice(synced);
      await AsyncStorage.setItem(KEY_WSD_CORRECTIONS, JSON.stringify(remaining));
    }

    if (synced > 0) {
      await AsyncStorage.setItem(KEY_LAST_SYNC, new Date().toISOString());
      console.log(`[Sync] WSD 교정 ${synced}건 동기화 완료`);
    }

    return synced;
  } catch (error) {
    console.warn('[Sync] WSD 교정 동기화 실패:', error);
    return 0;
  }
}

/** 마지막 동기화 시각 조회 */
export async function getLastSyncTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_LAST_SYNC);
  } catch {
    return null;
  }
}

/** 오변환 신고 (즉시 Supabase 전송) */
export async function reportError(
  koreanWord: string,
  predictedHanja: string,
  contextSentence?: string,
  sourceUrl?: string,
): Promise<boolean> {
  try {
    const userId = await getUserId();
    const { error } = await supabase.from('error_reports').insert({
      user_id: userId,
      korean_word: koreanWord,
      predicted_hanja: predictedHanja,
      correct_hanja: '', // 사용자가 정답을 모르는 경우
      context_sentence: contextSentence?.slice(0, 500) || null,
      source_url: sourceUrl?.slice(0, 2000) || null,
    });
    if (error) {
      console.warn('[Sync] 오변환 신고 실패:', error.message);
      return false;
    }
    console.log(`[Sync] 오변환 신고: ${koreanWord} → ${predictedHanja}`);
    return true;
  } catch {
    return false;
  }
}

/** 전체 동기화 (앱 포그라운드 복귀 시 호출) */
export async function syncAll(): Promise<void> {
  await syncWSDCorrections();
  // 나중에 노출/클릭 동기화도 추가
}
