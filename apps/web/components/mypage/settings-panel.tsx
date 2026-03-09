"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { updateProfile } from "@/lib/vocab/actions";
import { useRouter } from "next/navigation";

export function SettingsPanel({
  nickname: initialNickname,
  currentLevel: initialLevel,
  userEmail,
  levelOptions,
}: {
  nickname: string;
  currentLevel: number;
  userEmail: string;
  levelOptions: { value: number; label: string }[];
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialNickname);
  const [level, setLevel] = useState(initialLevel);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSaveNickname = () => {
    startTransition(async () => {
      await updateProfile({ nickname });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  };

  const handleLevelChange = (newLevel: number) => {
    setLevel(newLevel);
    startTransition(async () => {
      await updateProfile({ current_level: newLevel });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* 닉네임 */}
      <div className="rounded-xl bg-white border-2 border-vanilla p-5">
        <h3 className="text-sm font-semibold text-warm-brown mb-3">닉네임</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="flex-1 rounded-xl border-2 border-vanilla bg-cream/50 px-4 py-2.5 text-sm outline-none focus:border-tan transition-colors"
          />
          <button
            onClick={handleSaveNickname}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl bg-tan text-cream text-sm font-medium hover:bg-tan-dark transition-colors cursor-pointer disabled:opacity-50"
          >
            {saved ? "저장됨 ✓" : "저장"}
          </button>
        </div>
      </div>

      {/* 급수 설정 */}
      <div className="rounded-xl bg-white border-2 border-vanilla p-5">
        <h3 className="text-sm font-semibold text-warm-brown mb-1">
          급수 설정
        </h3>
        <p className="text-xs text-warm-brown-light mb-3">
          설정한 급수까지의 한자가 웹페이지에 표시됩니다
        </p>
        <select
          value={level}
          onChange={(e) => handleLevelChange(Number(e.target.value))}
          disabled={isPending}
          className="w-full rounded-xl border-2 border-vanilla bg-cream/50 px-4 py-2.5 text-sm outline-none focus:border-tan transition-colors cursor-pointer disabled:opacity-50"
        >
          {levelOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} {opt.value >= 4 ? "(무료)" : "(프리미엄)"}
            </option>
          ))}
        </select>
      </div>

      {/* 이메일 */}
      <div className="rounded-xl bg-white border-2 border-vanilla p-5">
        <h3 className="text-sm font-semibold text-warm-brown mb-3">이메일</h3>
        <p className="text-sm text-warm-brown-light">{userEmail}</p>
      </div>

      {/* 진단 테스트 */}
      <div className="rounded-xl bg-white border-2 border-vanilla p-5">
        <h3 className="text-sm font-semibold text-warm-brown mb-1">
          한자 실력 진단
        </h3>
        <p className="text-xs text-warm-brown-light mb-3">
          진단 테스트로 나에게 맞는 급수를 찾아보세요
        </p>
        <Link
          href="/test?level=8"
          className="inline-block px-5 py-2.5 rounded-xl bg-vanilla text-warm-brown text-sm font-medium hover:bg-sage transition-colors"
        >
          진단 테스트 하기
        </Link>
      </div>

      {/* 로그아웃 / 탈퇴 */}
      <div className="rounded-xl bg-white border-2 border-vanilla p-5">
        <h3 className="text-sm font-semibold text-warm-brown mb-3">
          계정 관리
        </h3>
        <div className="flex gap-3">
          <form action={logout}>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-vanilla text-warm-brown text-sm font-medium hover:bg-sage transition-colors cursor-pointer"
            >
              로그아웃
            </button>
          </form>
          <button className="px-5 py-2.5 rounded-xl text-red-400 text-sm font-medium hover:bg-red-50 transition-colors cursor-pointer">
            회원 탈퇴
          </button>
        </div>
      </div>
    </div>
  );
}
