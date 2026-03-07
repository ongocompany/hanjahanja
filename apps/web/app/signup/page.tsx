"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signup } from "@/lib/auth/actions";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const passwordConfirm = formData.get("passwordConfirm") as string;

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      setLoading(false);
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }

    const result = await signup(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-cream">
      {/* 홈 링크 */}
      <Link
        href="/"
        className="absolute top-6 left-6 text-xl font-bold text-warm-brown"
      >
        한자한자
      </Link>
        <div className="w-full max-w-sm">
          {!success && (
            <div className="text-center mb-8">
              <Image
                src="/images/warmsmile.png"
                alt="미소짓는 책벌레"
                width={80}
                height={104}
                className="mx-auto mb-4 drop-shadow-sm"
              />
              <h1 className="text-2xl font-bold sm:text-3xl">회원가입</h1>
              <p className="mt-2 text-sm text-warm-brown-light">
                한자한자와 함께 한자 실력을 키워보세요
              </p>
            </div>
          )}

          {success ? (
            <div className="rounded-2xl bg-vanilla/60 p-6 text-center">
              <Image
                src="/images/missioncomplete.png"
                alt="미션완료"
                width={70}
                height={77}
                className="mx-auto mb-4"
              />
              <h2 className="text-lg font-bold">가입 완료!</h2>
              <p className="mt-2 text-sm text-warm-brown-light leading-relaxed">
                입력하신 이메일로 확인 메일을 보냈습니다.
                <br />
                메일의 링크를 클릭하면 가입이 완료됩니다.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-xl bg-tan px-6 py-2.5 text-sm font-semibold text-cream hover:bg-tan-dark transition-colors"
              >
                로그인하러 가기
              </Link>
            </div>
          ) : (
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
                  minLength={6}
                  placeholder="6자 이상"
                  className="w-full rounded-xl border-2 border-vanilla bg-white px-4 py-3 text-base outline-none focus:border-tan transition-colors placeholder:text-warm-brown-light/40"
                />
              </div>

              <div>
                <label
                  htmlFor="passwordConfirm"
                  className="block text-sm font-medium text-warm-brown mb-1"
                >
                  비밀번호 확인
                </label>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  required
                  minLength={6}
                  placeholder="비밀번호 다시 입력"
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
                {loading ? "가입 중..." : "회원가입"}
              </button>
            </form>
          )}

          {!success && (
            <p className="mt-6 text-center text-sm text-warm-brown-light">
              이미 계정이 있나요?{" "}
              <Link
                href="/login"
                className="font-semibold text-tan-dark hover:underline"
              >
                로그인
              </Link>
            </p>
          )}
        </div>
    </main>
  );
}
