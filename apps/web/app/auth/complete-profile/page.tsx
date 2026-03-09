"use client";

import { Suspense, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { completeProfile } from "@/lib/auth/actions";

function CompleteProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const allAgreed = termsAgreed && privacyAgreed;

  function formatPhone(value: string) {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  }

  function handleAllAgree(checked: boolean) {
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    if (!allAgreed) {
      setError("필수 약관에 동의해주세요.");
      return;
    }

    const phoneNums = phone.replace(/\D/g, "");
    if (phone && (phoneNums.length < 10 || phoneNums.length > 11)) {
      setError("올바른 전화번호를 입력해주세요.");
      return;
    }

    startTransition(async () => {
      const result = await completeProfile({
        nickname: name.trim(),
        phone: phoneNums || undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        router.push(next);
      }
    });
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <Image
          src="/images/warmsmile.png"
          alt="미소짓는 책벌레"
          width={80}
          height={104}
          className="mx-auto mb-4 drop-shadow-sm"
        />
        <h1 className="text-2xl font-bold">환영합니다!</h1>
        <p className="mt-2 text-sm text-warm-brown-light">
          서비스 이용을 위해 아래 정보를 입력해주세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 이름 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-warm-brown mb-1">
            이름 <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="실명 또는 닉네임"
            className="w-full rounded-xl border-2 border-vanilla bg-white px-4 py-3 text-base outline-none focus:border-tan transition-colors placeholder:text-warm-brown-light/40"
          />
        </div>

        {/* 전화번호 */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-warm-brown mb-1">
            전화번호 <span className="text-warm-brown-light text-xs">(선택)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="010-1234-5678"
            className="w-full rounded-xl border-2 border-vanilla bg-white px-4 py-3 text-base outline-none focus:border-tan transition-colors placeholder:text-warm-brown-light/40"
          />
        </div>

        {/* 약관 동의 */}
        <div className="space-y-2 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allAgreed}
              onChange={(e) => handleAllAgree(e.target.checked)}
              className="w-4 h-4 rounded accent-tan"
            />
            <span className="text-sm font-semibold text-warm-brown">전체 동의</span>
          </label>

          <div className="border-t border-vanilla pt-2 ml-1 space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-tan"
              />
              <span className="text-sm text-warm-brown-light">
                <Link href="/terms" className="underline" target="_blank">이용약관</Link> 동의
                <span className="text-red-400 ml-0.5">(필수)</span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-tan"
              />
              <span className="text-sm text-warm-brown-light">
                <Link href="/privacy" className="underline" target="_blank">개인정보처리방침</Link> 동의
                <span className="text-red-400 ml-0.5">(필수)</span>
              </span>
            </label>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !allAgreed}
          className="w-full rounded-xl bg-tan py-3 text-base font-semibold text-cream hover:bg-tan-dark transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "저장 중..." : "시작하기"}
        </button>
      </form>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-cream">
      <Suspense>
        <CompleteProfileForm />
      </Suspense>
    </main>
  );
}
