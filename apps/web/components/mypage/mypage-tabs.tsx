"use client";

import { useState } from "react";
import { VocabList } from "./vocab-list";
import { SettingsPanel } from "./settings-panel";
import type { VocabItem } from "@/lib/vocab/actions";

type Tab = "vocab" | "settings";

export function MyPageTabs({
  vocab,
  nickname,
  currentLevel,
  userEmail,
  userPhone,
  levelOptions,
}: {
  vocab: VocabItem[];
  nickname: string;
  currentLevel: number;
  userEmail: string;
  userPhone: string | null;
  levelOptions: { value: number; label: string }[];
}) {
  const [tab, setTab] = useState<Tab>("vocab");

  return (
    <>
      {/* 탭 */}
      <div className="flex gap-1 mb-6 bg-vanilla/40 rounded-xl p-1">
        <button
          onClick={() => setTab("vocab")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            tab === "vocab"
              ? "bg-white text-warm-brown shadow-sm"
              : "text-warm-brown-light hover:text-warm-brown"
          }`}
        >
          단어장
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            tab === "settings"
              ? "bg-white text-warm-brown shadow-sm"
              : "text-warm-brown-light hover:text-warm-brown"
          }`}
        >
          계정 설정
        </button>
      </div>

      {tab === "vocab" && <VocabList initialVocab={vocab} />}
      {tab === "settings" && (
        <SettingsPanel
          nickname={nickname}
          currentLevel={currentLevel}
          userEmail={userEmail}
          userPhone={userPhone}
          levelOptions={levelOptions}
        />
      )}
    </>
  );
}
