import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

// 네이버 로그인 페이지로 리다이렉트
export async function GET() {
  const state = randomBytes(16).toString("hex");

  // CSRF 방지용 state를 쿠키에 저장
  const cookieStore = await cookies();
  cookieStore.set("naver_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10분
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.NAVER_CLIENT_ID!,
    redirect_uri: getCallbackUrl(),
    state,
  });

  return NextResponse.redirect(
    `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`
  );
}

function getCallbackUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3500";
  return `${base}/api/auth/naver/callback`;
}
