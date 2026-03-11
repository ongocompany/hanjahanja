import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './client';

// Expo의 redirect URI (개발/프로덕션 자동 처리)
const redirectTo = makeRedirectUri();

export type SocialProvider = 'google' | 'kakao';

// 소셜 로그인 (브라우저 열어서 OAuth 진행)
export async function signInWithProvider(provider: SocialProvider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true, // 앱에서 직접 브라우저 제어
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('OAuth URL을 받지 못했습니다');

  // 인앱 브라우저로 OAuth 페이지 열기
  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectTo,
  );

  if (result.type === 'success') {
    const url = result.url;
    // URL에서 토큰 추출하여 세션 설정
    const params = new URL(url);
    const fragment = params.hash?.substring(1);
    if (fragment) {
      const searchParams = new URLSearchParams(fragment);
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    }
  }
}

// 로그아웃
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// 현재 프로필 조회
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}
