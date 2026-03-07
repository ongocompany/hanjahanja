"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { login } from "@/lib/auth/actions";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const result = await login(formData);

    // login 성공 시 redirect되므로 여기 도달하면 에러
    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-cream">
      <Link
        href="/"
        className="absolute top-6 left-6 text-xl font-bold text-warm-brown"
      >
        한자한자
      </Link>
        <div className="w-full max-w-sm">
          {/* 캐릭터 + 타이틀 */}
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
              다시 만나서 반가워요!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-warm-brown mb-1"
              >
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="email@example.com"
                className="w-full rounded-xl border-2 border-vanilla bg-white px-4 py-3 text-base outline-none focus:border-tan transition-colors placeholder:text-warm-brown-light/40"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-warm-brown mb-1"
              >
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="비밀번호 입력"
                className="w-full rounded-xl border-2 border-vanilla bg-white px-4 py-3 text-base outline-none focus:border-tan transition-colors placeholder:text-warm-brown-light/40"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-tan py-3 text-base font-semibold text-cream hover:bg-tan-dark transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-warm-brown-light">
            계정이 없나요?{" "}
            <Link
              href="/signup"
              className="font-semibold text-tan-dark hover:underline"
            >
              회원가입
            </Link>
          </p>
        </div>
    </main>
  );
}
