"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { logout, deleteAccount } from "@/lib/auth/actions";
import { updateProfile } from "@/lib/vocab/actions";
import { useRouter } from "next/navigation";

export function SettingsPanel({
  nickname: initialNickname,
  currentLevel: initialLevel,
  userEmail,
  userPhone: initialPhone,
  levelOptions,
}: {
  nickname: string;
  currentLevel: number;
  userEmail: string;
  userPhone: string | null;
  levelOptions: { value: number; label: string }[];
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialNickname);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [level, setLevel] = useState(initialLevel);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // 전화번호 포맷팅 (010-1234-5678)
  function formatPhone(value: string) {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  }

  const handleSaveNickname = () => {
    startTransition(async () => {
      await updateProfile({ nickname });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  };

  const handleSavePhone = () => {
    const nums = phone.replace(/\D/g, "");
    if (nums.length < 10 || nums.length > 11) return;
    startTransition(async () => {
      await updateProfile({ phone: nums });
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 2000);
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

      {/* 전화번호 */}
      <div className="rounded-xl bg-white border-2 border-vanilla p-5">
        <h3 className="text-sm font-semibold text-warm-brown mb-3">전화번호</h3>
        <div className="flex gap-3">
          <input
            type="tel"
            value={formatPhone(phone)}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="010-1234-5678"
            className="flex-1 rounded-xl border-2 border-vanilla bg-cream/50 px-4 py-2.5 text-sm outline-none focus:border-tan transition-colors"
          />
          <button
            onClick={handleSavePhone}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl bg-tan text-cream text-sm font-medium hover:bg-tan-dark transition-colors cursor-pointer disabled:opacity-50"
          >
            {phoneSaved ? "저장됨 ✓" : "저장"}
          </button>
        </div>
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
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-5 py-2.5 rounded-xl text-red-400 text-sm font-medium hover:bg-red-50 transition-colors cursor-pointer"
          >
            회원 탈퇴
          </button>
        </div>
      </div>

      {/* 회원 탈퇴 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-warm-brown mb-2">
              정말 탈퇴하시겠습니까?
            </h3>
            <p className="text-sm text-warm-brown-light mb-4">
              탈퇴하면 저장된 단어장, 학습 기록 등 모든 데이터가
              <span className="text-red-500 font-semibold"> 즉시 삭제</span>되며
              복구할 수 없습니다.
            </p>
            <p className="text-sm text-warm-brown mb-2">
              확인을 위해 <span className="font-semibold">&quot;탈퇴합니다&quot;</span>를 입력해주세요.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="탈퇴합니다"
              className="w-full rounded-xl border-2 border-vanilla bg-cream/50 px-4 py-2.5 text-sm outline-none focus:border-red-300 transition-colors mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="px-5 py-2.5 rounded-xl bg-vanilla text-warm-brown text-sm font-medium hover:bg-sage transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => {
                  startTransition(async () => {
                    const result = await deleteAccount();
                    if (result.error) {
                      alert(`탈퇴 실패: ${result.error}`);
                    } else {
                      router.push("/");
                      router.refresh();
                    }
                  });
                }}
                disabled={deleteConfirmText !== "탈퇴합니다" || isPending}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
