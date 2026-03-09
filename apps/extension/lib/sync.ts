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

/** 로컬 단어장 → Supabase 일괄 동기화 */
export async function syncLocalVocabulary(): Promise<number> {
  const userId = await getUserId();
  if (!userId) return 0;

  const client = getSupabase();
  if (!client) return 0;

  const result = await browser.storage.local.get(['localVocabulary', 'vocabSyncedCount']);
  const vocab = (result.localVocabulary as Array<Record<string, unknown>>) ?? [];
  const syncedCount = (result.vocabSyncedCount as number) ?? 0;

  // 이미 동기화된 것 이후만 전송
  const newItems = vocab.slice(syncedCount);
  if (newItems.length === 0) return 0;

  const rows = newItems.map((v) => ({
    user_id: userId,
    korean_word: v.word as string,
    hanja: v.hanja as string,
    context_sentence: (v.contextSentence as string) || null,
    source_url: (v.sourceUrl as string) || null,
    source_title: (v.sourceTitle as string) || null,
  }));

  // 50개씩 배치 insert
  let synced = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await client.from('user_vocabulary').insert(batch);
    if (!error) synced += batch.length;
  }

  if (synced > 0) {
    await browser.storage.local.set({ vocabSyncedCount: syncedCount + synced });
    console.log(`[한자한자 Sync] 단어장 ${synced}건 일괄 동기화`);
  }

  return synced;
}

/** 퀴즈 결과 저장 (단건) */
export async function saveQuizResult(
  koreanWord: string,
  hanja: string,
  isCorrect: boolean,
  quizType: string,
): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;

  const client = getSupabase();
  if (!client) return false;

  const { error } = await client.from('user_quiz_results').insert({
    user_id: userId,
    korean_word: koreanWord,
    hanja,
    is_correct: isCorrect,
    quiz_type: quizType,
  });

  if (error) {
    console.error('[한자한자 Sync] 퀴즈 결과 저장 실패:', error.message);
    return false;
  }

  return true;
}

/** 오답 단어 목록 조회 (최근 7일, 정답으로 만회하지 못한 단어) */
export async function getWrongWords(): Promise<Array<{ word: string; hanja: string; wrongCount: number }>> {
  const userId = await getUserId();
  if (!userId) return [];

  const client = getSupabase();
  if (!client) return [];

  // 최근 7일 퀴즈 결과 조회
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data, error } = await client
    .from('user_quiz_results')
    .select('korean_word, hanja, is_correct')
    .eq('user_id', userId)
    .gte('answered_at', sevenDaysAgo);

  if (error || !data) return [];

  // 단어별 정답/오답 집계
  const stats = new Map<string, { word: string; hanja: string; wrong: number; correct: number }>();
  for (const row of data) {
    const key = `${row.korean_word}|${row.hanja}`;
    const s = stats.get(key) ?? { word: row.korean_word, hanja: row.hanja, wrong: 0, correct: 0 };
    if (row.is_correct) s.correct++;
    else s.wrong++;
    stats.set(key, s);
  }

  // 오답이 정답보다 많은 단어 반환 (오답 횟수 내림차순)
  return [...stats.values()]
    .filter((s) => s.wrong > s.correct)
    .sort((a, b) => (b.wrong - b.correct) - (a.wrong - a.correct))
    .map((s) => ({ word: s.word, hanja: s.hanja, wrongCount: s.wrong - s.correct }));
}

/** 오변환 신고 저장 */
export async function reportError(
  koreanWord: string,
  predictedHanja: string,
  correctHanja: string,
  contextSentence?: string,
  sourceUrl?: string,
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const userId = await getUserId();

  const { error } = await client.from('error_reports').insert({
    user_id: userId ?? null,
    korean_word: koreanWord,
    predicted_hanja: predictedHanja,
    correct_hanja: correctHanja,
    context_sentence: contextSentence?.slice(0, 500) ?? null,
    source_url: sourceUrl?.slice(0, 2000) ?? null,
  });

  if (error) {
    console.error('[한자한자] 오변환 신고 실패:', error.message);
    return false;
  }

  console.log(`[한자한자] 오변환 신고: ${koreanWord} ${predictedHanja} → ${correctHanja}`);
  return true;
}

/** 전체 동기화 (팝업 열 때 등) */
export async function syncAll(): Promise<void> {
  await Promise.all([syncExposures(), syncClicks(), syncLocalVocabulary()]);
}
