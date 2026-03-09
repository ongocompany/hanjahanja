"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Provider } from "@supabase/supabase-js";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

function sanitizeRedirect(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const next = sanitizeRedirect((formData.get("next") as string) || "/");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  redirect(next);
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
