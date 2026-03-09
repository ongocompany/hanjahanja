import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const origin = getOrigin();

  // 에러 또는 코드 없음
  if (errorParam || !code) {
    return NextResponse.redirect(`${origin}/login?error=naver_denied`);
  }

  // CSRF state 검증
  const cookieStore = await cookies();
  const savedState = cookieStore.get("naver_oauth_state")?.value;
  cookieStore.delete("naver_oauth_state");

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${origin}/login?error=invalid_state`);
  }

  try {
    // 1. 네이버에서 access_token 교환
    const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        code,
        state: state!,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${origin}/login?error=naver_token_failed`);
    }

    // 2. 네이버 사용자 정보 조회
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();

    if (profileData.resultcode !== "00" || !profileData.response?.email) {
      return NextResponse.redirect(`${origin}/login?error=naver_profile_failed`);
    }

    const { email, name, profile_image } = profileData.response;

    // 3. Supabase admin으로 사용자 생성 (이미 있으면 무시)
    const admin = createAdminClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: name || "",
        avatar_url: profile_image || "",
        provider: "naver",
      },
    });

    // 이미 존재하는 유저는 무시 (duplicate 에러)
    if (createError && !createError.message.includes("already been registered")) {
      return NextResponse.redirect(`${origin}/login?error=user_create_failed`);
    }

    // 4. magic link 토큰 생성 → 세션 발급
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      return NextResponse.redirect(`${origin}/login?error=session_failed`);
    }

    // 5. 서버 클라이언트로 OTP 검증 → 세션 쿠키 설정
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError) {
      return NextResponse.redirect(`${origin}/login?error=verify_failed`);
    }

    return NextResponse.redirect(origin);
  } catch {
    return NextResponse.redirect(`${origin}/login?error=naver_error`);
  }
}

function getOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3500";
}
