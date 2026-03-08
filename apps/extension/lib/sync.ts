/**
 * Supabase 동기화 모듈
 *
 * 로그인 시에만 chrome.storage → Supabase로 데이터 전송
 * - syncExposures(): 노출 데이터 UPSERT
 * - syncClicks(): 클릭 데이터 INSERT
 * - syncVocabulary(): 단어장 INSERT
 */

import { getSupabase } from './auth';
import { getUserId } from './auth';

/** 오늘 노출 데이터를 Supabase에 동기화 (UPSERT) */
export async function syncExposures(): Promise<number> {
  const userId = await getUserId();
  if (!userId) return 0;

  const client = getSupabase();
  if (!client) return 0;

  const result = await browser.storage.local.get('todayExposures');
  const exposures = (result.todayExposures as Record<string, number>) ?? {};
  const entries = Object.entries(exposures);
  if (entries.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  let synced = 0;

  // 배치 upsert (50개씩)
  for (let i = 0; i < entries.length; i += 50) {
    const batch = entries.slice(i, i + 50).map(([key, count]) => {
      const [koreanWord, hanja] = key.split('|');
      return {
        user_id: userId,
        korean_word: koreanWord,
        hanja,
        exposure_count: count,
        exposure_date: today,
      };
    });

    const { error } = await client
      .from('user_exposures')
      .upsert(batch, {
        onConflict: 'user_id,korean_word,hanja,exposure_date',
      });

    if (!error) synced += batch.length;
  }

  console.log(`[한자한자 Sync] 노출 ${synced}건 동기화`);
  return synced;
}

/** 오늘 클릭 데이터를 Supabase에 동기화 (INSERT) */
export async function syncClicks(): Promise<number> {
  const userId = await getUserId();
  if (!userId) return 0;

  const client = getSupabase();
  if (!client) return 0;

  const result = await browser.storage.local.get(['todayClicks', 'lastClickSyncIndex']);
  const clicks = (result.todayClicks as Array<Record<string, unknown>>) ?? [];
  const lastIndex = (result.lastClickSyncIndex as number) ?? 0;

  // 이미 동기화된 것 이후만 전송
  const newClicks = clicks.slice(lastIndex);
  if (newClicks.length === 0) return 0;

  const rows = newClicks.map((click) => ({
    user_id: userId,
    korean_word: click.word as string,
    hanja: click.hanja as string,
    context_sentence: (click.contextSentence as string) ?? null,
    source_url: (click.sourceUrl as string) ?? null,
  }));

  const { error } = await client.from('user_clicks').insert(rows);

  if (!error) {
    // 동기화 완료된 인덱스 기록
    await browser.storage.local.set({ lastClickSyncIndex: clicks.length });
    console.log(`[한자한자 Sync] 클릭 ${rows.length}건 동기화`);
    return rows.length;
  }

  return 0;
}

/** 단어장 저장 (단건) */
export async function saveToVocabulary(
  koreanWord: string,
  hanja: string,
  contextSentence?: string,
  sourceUrl?: string,
  sourceTitle?: string,
): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;

  const client = getSupabase();
  if (!client) return false;

  const { error } = await client.from('user_vocabulary').insert({
    user_id: userId,
    korean_word: koreanWord,
    hanja,
    context_sentence: contextSentence ?? null,
    source_url: sourceUrl ?? null,
    source_title: sourceTitle ?? null,
  });

  if (error) {
    console.error('[한자한자 Sync] 단어장 저장 실패:', error.message);
    return false;
  }

  console.log(`[한자한자 Sync] 단어장 저장: ${koreanWord} → ${hanja}`);
  return true;
}

/** 전체 동기화 (팝업 열 때 등) */
export async function syncAll(): Promise<void> {
  await Promise.all([syncExposures(), syncClicks()]);
}
