"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const error = searchParams.get("error");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-cream">
      <Link
        href="/"
        className="absolute top-6 left-6 text-xl font-bold text-warm-brown"
      >
        한자한자
      </Link>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/images/default.png"
            alt="책벌레"
            width={60}
            height={80}
            className="mx-auto mb-4 drop-shadow-sm"
          />
          <h1 className="text-2xl font-bold sm:text-3xl">로그인</h1>
          <p className="mt-2 text-sm text-warm-brown-light">
            간편하게 시작하세요!
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4 text-center">
            {error === "auth_failed"
              ? "로그인에 실패했습니다. 다시 시도해주세요."
              : error === "naver_denied"
                ? "네이버 로그인이 취소되었습니다."
                : "로그인 중 오류가 발생했습니다."}
          </p>
        )}

        <SocialLoginButtons next={next} />

        <p className="mt-8 text-center text-xs text-warm-brown-light/60">
          로그인 시{" "}
          <Link href="/terms" className="underline">
            이용약관
          </Link>
          {" "}및{" "}
          <Link href="/privacy" className="underline">
            개인정보처리방침
          </Link>
          에 동의하게 됩니다.
        </p>
      </div>
    </main>
  );
}
