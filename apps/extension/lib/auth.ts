/**
 * 확장 프로그램 Supabase 인증 모듈
 *
 * - chrome.storage에 세션 토큰 저장
 * - 웹에서 로그인 후 세션 전달 or 팝업에서 직접 로그인
 * - 로그인 상태 확인 + 세션 refresh
 */

import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

const SESSION_KEY = 'supabaseSession';

// 환경변수: .env 또는 하드코딩 (빌드 시 주입)
// WXT에서는 import.meta.env.VITE_* 패턴 사용
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

/** Supabase 클라이언트 (싱글톤) */
export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[한자한자] Supabase 환경변수 미설정');
    return null;
  }

  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // 확장에서는 localStorage 대신 chrome.storage 사용
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabase;
}

/** 저장된 세션 로드 */
export async function loadSession(): Promise<Session | null> {
  try {
    const result = await browser.storage.local.get(SESSION_KEY);
    const session = result[SESSION_KEY] as Session | undefined;
    if (!session) return null;

    // 세션을 Supabase 클라이언트에 설정
    const client = getSupabase();
    if (client && session.access_token) {
      await client.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }

    return session;
  } catch (err) {
    console.warn('[한자한자] 세션 로드 실패:', err);
    return null;
  }
}

/** 세션 저장 */
export async function saveSession(session: Session): Promise<void> {
  await browser.storage.local.set({ [SESSION_KEY]: session });
}

/** 세션 삭제 (로그아웃) */
export async function clearSession(): Promise<void> {
  const client = getSupabase();
  if (client) {
    await client.auth.signOut();
  }
  await browser.storage.local.remove(SESSION_KEY);
}

/** 현재 유저 ID (로그인 안 됐으면 null) */
export async function getUserId(): Promise<string | null> {
  const session = await loadSession();
  return session?.user?.id ?? null;
}

/** 로그인 여부 확인 */
export async function isLoggedIn(): Promise<boolean> {
  const session = await loadSession();
  if (!session) return false;

  // 만료 체크
  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt < now) {
    // 세션 만료 → refresh 시도
    const refreshed = await refreshSession();
    return refreshed;
  }

  return true;
}

/** 세션 갱신 */
async function refreshSession(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const stored = await browser.storage.local.get(SESSION_KEY);
  const session = stored[SESSION_KEY] as Session | undefined;
  if (!session?.refresh_token) return false;

  const { data, error } = await client.auth.refreshSession({
    refresh_token: session.refresh_token,
  });

  if (error || !data.session) {
    await clearSession();
    return false;
  }

  await saveSession(data.session);
  return true;
}
