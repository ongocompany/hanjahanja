"use client";

import { socialLogin } from "@/lib/auth/actions";

export function SocialLoginButtons() {
  return (
    <div className="space-y-3">
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-vanilla" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-cream px-3 text-warm-brown-light">간편 로그인</span>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        {/* Google */}
        <button
          type="button"
          onClick={() => socialLogin("google")}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-vanilla hover:border-tan transition-colors cursor-pointer"
          title="Google로 로그인"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </button>

        {/* Kakao */}
        <button
          type="button"
          onClick={() => socialLogin("kakao")}
          className="flex items-center justify-center w-12 h-12 rounded-full hover:opacity-80 transition-opacity cursor-pointer"
          style={{ backgroundColor: "#FEE500" }}
          title="카카오로 로그인"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
            <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.15a.37.37 0 00.56.4l4.94-3.26c.4.04.82.07 1.24.07 5.52 0 10-3.36 10-7.6C22 6.36 17.52 3 12 3z"/>
          </svg>
        </button>

        {/* Naver — Supabase 미지원이라 자체 API 라우트 사용 */}
        <a
          href="/api/auth/naver"
          className="flex items-center justify-center w-12 h-12 rounded-full hover:opacity-80 transition-opacity cursor-pointer"
          style={{ backgroundColor: "#03C75A" }}
          title="네이버로 로그인"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="white">
            <path d="M13.56 10.74L6.17 0H0v20h6.44V9.26L13.83 20H20V0h-6.44z"/>
          </svg>
        </a>
      </div>
    </div>
  );
}
