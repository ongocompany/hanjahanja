"use client";

import { Suspense, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { updateProfile } from "@/lib/vocab/actions";

function CompleteProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // 전화번호 포맷팅 (010-1234-5678)
  function formatPhone(value: string) {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const nums = phone.replace(/\D/g, "");
    if (nums.length < 10 || nums.length > 11) {
      setError("올바른 전화번호를 입력해주세요.");
      return;
    }

    startTransition(async () => {
      const result = await updateProfile({ phone: nums });
      if (result.error) {
        setError(result.error);
      } else {
        router.push(next);
      }
    });
  }

  function handleSkip() {
    router.push(next);
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
          원활한 서비스 이용을 위해 전화번호를 입력해주세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-warm-brown mb-1"
          >
            전화번호
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

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-tan py-3 text-base font-semibold text-cream hover:bg-tan-dark transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "저장 중..." : "저장하고 시작하기"}
        </button>

        <button
          type="button"
          onClick={handleSkip}
          className="w-full rounded-xl bg-vanilla/60 py-3 text-base font-medium text-warm-brown-light hover:bg-vanilla transition-colors cursor-pointer"
        >
          나중에 입력할게요
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-warm-brown-light/60">
        전화번호는 서비스 관련 안내에만 사용되며,{" "}
        <a href="/privacy" className="underline">
          개인정보처리방침
        </a>
        에 따라 관리됩니다.
      </p>
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
