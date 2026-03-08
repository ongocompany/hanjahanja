"use client";

import { useState } from "react";
import Link from "next/link";
import { logout } from "@/lib/auth/actions";

// ─── 목데이터 ───
const MOCK_VOCAB = [
  { id: 1, word: "경제", hanja: "經濟", meaning: "재물을 잘 다스림", context: "한국 경제가 빠르게 성장하고 있다.", mastered: false, savedAt: "2026-03-07" },
  { id: 2, word: "정치", hanja: "政治", meaning: "나라를 다스리는 일", context: "정치에 관심을 가져야 한다.", mastered: true, savedAt: "2026-03-07" },
  { id: 3, word: "사회", hanja: "社會", meaning: "같은 무리끼리 모여 이루는 집단", context: "현대 사회는 복잡하다.", mastered: false, savedAt: "2026-03-06" },
  { id: 4, word: "문화", hanja: "文化", meaning: "사회 구성원들이 만들어 가는 생활 양식", context: "한국 문화가 세계에 알려지고 있다.", mastered: false, savedAt: "2026-03-06" },
  { id: 5, word: "교육", hanja: "敎育", meaning: "지식과 기술을 가르치고 배우는 활동", context: "교육의 중요성은 아무리 강조해도 지나치지 않다.", mastered: true, savedAt: "2026-03-05" },
  { id: 6, word: "역사", hanja: "歷史", meaning: "인류가 거쳐 온 모습이나 그 기록", context: "역사를 잊은 민족에게 미래는 없다.", mastered: false, savedAt: "2026-03-05" },
  { id: 7, word: "과학", hanja: "科學", meaning: "자연 현상을 체계적으로 연구하는 학문", context: "과학 기술이 발전하면서 생활이 편리해졌다.", mastered: false, savedAt: "2026-03-04" },
  { id: 8, word: "대통령", hanja: "大統領", meaning: "한 나라의 으뜸가는 자리", context: "대통령이 국민에게 연설했다.", mastered: true, savedAt: "2026-03-04" },
  { id: 9, word: "민주", hanja: "民主", meaning: "국가의 주권이 국민에게 있는 것", context: "민주주의는 국민이 주인인 정치 체제이다.", mastered: false, savedAt: "2026-03-03" },
  { id: 10, word: "자유", hanja: "自由", meaning: "외부의 구속 없이 자기 뜻대로 행동함", context: "자유는 소중한 가치이다.", mastered: true, savedAt: "2026-03-03" },
];

const LEVEL_OPTIONS = [
  { value: 8, label: "8급" }, { value: 7.5, label: "준7급" },
  { value: 7, label: "7급" }, { value: 6.5, label: "준6급" },
  { value: 6, label: "6급" }, { value: 5.5, label: "준5급" },
  { value: 5, label: "5급" }, { value: 4.5, label: "준4급" },
  { value: 4, label: "4급" },
];

type Tab = "vocab" | "settings";
type Filter = "all" | "mastered" | "learning";

export default function MyPage() {
  const [tab, setTab] = useState<Tab>("vocab");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [vocab, setVocab] = useState(MOCK_VOCAB);
  const [level, setLevel] = useState(8);
  const [nickname, setNickname] = useState("진");

  // 목데이터 유저
  const userEmail = "jin@example.com";

  // 필터링된 단어장
  const filtered = vocab.filter((v) => {
    if (filter === "mastered" && !v.mastered) return false;
    if (filter === "learning" && v.mastered) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.word.includes(q) || v.hanja.includes(q) || v.meaning.includes(q);
    }
    return true;
  });

  const masteredCount = vocab.filter((v) => v.mastered).length;

  const toggleMastered = (id: number) => {
    setVocab((prev) =>
      prev.map((v) => (v.id === id ? { ...v, mastered: !v.mastered } : v))
    );
  };

  const deleteWord = (id: number) => {
    setVocab((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 sm:pt-24 pb-16">
        {/* 상단 프로필 카드 */}
        <div className="rounded-2xl bg-vanilla/60 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-warm-brown">{nickname}님의 학습</h1>
              <p className="text-sm text-warm-brown-light mt-1">
                현재 급수: <span className="font-semibold text-tan-dark">{LEVEL_OPTIONS.find((o) => o.value === level)?.label}</span>
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-tan-dark">{vocab.length}</div>
                <div className="text-xs text-warm-brown-light">저장한 단어</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-green-700">{masteredCount}</div>
                <div className="text-xs text-warm-brown-light">외운 단어</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-warm-brown">{vocab.length - masteredCount}</div>
                <div className="text-xs text-warm-brown-light">학습 중</div>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-vanilla/40 rounded-xl p-1">
          <button
            onClick={() => setTab("vocab")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === "vocab" ? "bg-white text-warm-brown shadow-sm" : "text-warm-brown-light hover:text-warm-brown"
            }`}
          >
            단어장
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === "settings" ? "bg-white text-warm-brown shadow-sm" : "text-warm-brown-light hover:text-warm-brown"
            }`}
          >
            계정 설정
          </button>
        </div>

        {/* 단어장 탭 */}
        {tab === "vocab" && (
          <div>
            {/* 검색 + 필터 */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                placeholder="단어, 한자, 뜻 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-xl border-2 border-vanilla bg-white px-4 py-2.5 text-sm outline-none focus:border-tan transition-colors placeholder:text-warm-brown-light/40"
              />
              <div className="flex rounded-xl border-2 border-vanilla overflow-hidden">
                {(["all", "learning", "mastered"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      filter === f
                        ? "bg-tan text-cream"
                        : "bg-white text-warm-brown-light hover:bg-vanilla/60"
                    }`}
                  >
                    {f === "all" ? "전체" : f === "learning" ? "학습 중" : "외움"}
                  </button>
                ))}
              </div>
            </div>

            {/* 단어 목록 */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-warm-brown-light">
                <p className="text-lg mb-2">
                  {search ? "검색 결과가 없습니다" : "저장된 단어가 없습니다"}
                </p>
                <p className="text-sm">
                  크롬 확장에서 한자를 우클릭하여 단어장에 추가해보세요!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((v) => (
                  <div
                    key={v.id}
                    className={`rounded-xl bg-white border-2 px-4 py-3 transition-colors ${
                      v.mastered ? "border-green-200 bg-green-50/30" : "border-vanilla"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xl font-bold text-warm-brown tracking-wider">
                            {v.hanja}
                          </span>
                          <span className="text-sm text-warm-brown-light">
                            {v.word}
                          </span>
                        </div>
                        <p className="text-sm text-warm-brown-light mb-1">{v.meaning}</p>
                        {v.context && (
                          <p className="text-xs text-warm-brown-light/60 truncate">
                            &ldquo;{v.context}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <button
                          onClick={() => toggleMastered(v.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            v.mastered
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-vanilla/60 text-warm-brown-light hover:bg-vanilla"
                          }`}
                        >
                          {v.mastered ? "외웠어요 ✓" : "외웠어요"}
                        </button>
                        <button
                          onClick={() => deleteWord(v.id)}
                          className="p-1.5 rounded-lg text-warm-brown-light/40 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="text-right mt-1">
                      <span className="text-[10px] text-warm-brown-light/40">{v.savedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-center text-xs text-warm-brown-light/40 mt-6">
              {filtered.length}개 단어 표시 중 (전체 {vocab.length}개)
            </p>
          </div>
        )}

        {/* 계정 설정 탭 */}
        {tab === "settings" && (
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
                <button className="px-5 py-2.5 rounded-xl bg-tan text-cream text-sm font-medium hover:bg-tan-dark transition-colors cursor-pointer">
                  저장
                </button>
              </div>
            </div>

            {/* 급수 설정 */}
            <div className="rounded-xl bg-white border-2 border-vanilla p-5">
              <h3 className="text-sm font-semibold text-warm-brown mb-1">급수 설정</h3>
              <p className="text-xs text-warm-brown-light mb-3">
                설정한 급수까지의 한자가 웹페이지에 표시됩니다
              </p>
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full rounded-xl border-2 border-vanilla bg-cream/50 px-4 py-2.5 text-sm outline-none focus:border-tan transition-colors cursor-pointer"
              >
                {LEVEL_OPTIONS.map((opt) => (
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
              <h3 className="text-sm font-semibold text-warm-brown mb-1">한자 실력 진단</h3>
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
              <h3 className="text-sm font-semibold text-warm-brown mb-3">계정 관리</h3>
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
        )}
      </div>
    </main>
  );
}
