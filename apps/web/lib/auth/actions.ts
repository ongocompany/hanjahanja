"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Provider } from "@supabase/supabase-js";

function sanitizeRedirect(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const ALLOWED_PROVIDERS: Provider[] = ["google", "kakao"];

export async function socialLogin(provider: Provider, next?: string) {
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return { error: "지원하지 않는 로그인 방식입니다." };
  }

  const supabase = await createClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3500";
  const safeNext = next ? sanitizeRedirect(next) : undefined;

  const callbackUrl = safeNext
    ? `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`
    : `${baseUrl}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

// 소셜 로그인 후 프로필 완성 (이름 + 전화번호 + 약관 동의)
export async function completeProfile(data: {
  nickname: string;
  phone?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다" };

  // avatar_url을 OAuth 메타데이터에서 가져오기
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  const { error } = await supabase
    .from("profiles")
    .update({
      nickname: data.nickname,
      phone: data.phone || null,
      avatar_url: avatarUrl,
      terms_agreed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return {};
}

// 회원 탈퇴 - 모든 사용자 데이터 삭제 후 auth 유저 삭제
export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다" };

  // 1. 사용자 데이터 삭제 (RLS로 본인 데이터만 삭제됨)
  await supabase.from("user_vocabulary").delete().eq("user_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);

  // 2. 로그아웃
  await supabase.auth.signOut();

  // 3. admin 권한으로 auth 유저 삭제
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) return { error: error.message };
  return {};
}
