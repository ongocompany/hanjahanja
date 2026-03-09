"use client";

import { useState, useTransition } from "react";
import { toggleMemorized, deleteVocab } from "@/lib/vocab/actions";
import type { VocabItem } from "@/lib/vocab/actions";
import { useRouter } from "next/navigation";

type Filter = "all" | "mastered" | "learning";

export function VocabList({ initialVocab }: { initialVocab: VocabItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [isPending, startTransition] = useTransition();

  const filtered = initialVocab.filter((v) => {
    if (filter === "mastered" && !v.is_memorized) return false;
    if (filter === "learning" && v.is_memorized) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.korean_word.includes(q) || v.hanja.includes(q);
    }
    return true;
  });

  const masteredCount = initialVocab.filter((v) => v.is_memorized).length;

  const handleToggle = (id: number, current: boolean) => {
    startTransition(async () => {
      await toggleMemorized(id, !current);
      router.refresh();
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteVocab(id);
      router.refresh();
    });
  };

  // 날짜별 그룹핑
  const grouped = groupByDate(filtered);

  return (
    <div>
      {/* 통계 요약 */}
      <div className="flex gap-6 text-center mb-6">
        <div>
          <div className="text-xl sm:text-2xl font-bold text-tan-dark">
            {initialVocab.length}
          </div>
          <div className="text-xs text-warm-brown-light">저장한 단어</div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-green-700">
            {masteredCount}
          </div>
          <div className="text-xs text-warm-brown-light">외운 단어</div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-warm-brown">
            {initialVocab.length - masteredCount}
          </div>
          <div className="text-xs text-warm-brown-light">학습 중</div>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="단어, 한자 검색..."
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

      {/* 단어 목록 (날짜별 그룹) */}
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
        <div className="space-y-6">
          {grouped.map(({ label, items }) => (
            <div key={label}>
              <h3 className="text-xs font-semibold text-warm-brown-light/60 uppercase tracking-wider mb-2 px-1">
                {label}
              </h3>
              <div className="space-y-2">
                {items.map((v) => (
                  <div
                    key={v.id}
                    className={`rounded-xl bg-white border-2 px-4 py-3 transition-colors ${
                      v.is_memorized
                        ? "border-green-200 bg-green-50/30"
                        : "border-vanilla"
                    } ${isPending ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xl font-bold text-warm-brown tracking-wider">
                            {v.hanja}
                          </span>
                          <span className="text-sm text-warm-brown-light">
                            {v.korean_word}
                          </span>
                        </div>
                        {v.context_sentence && (
                          <p className="text-xs text-warm-brown-light/60 truncate">
                            &ldquo;{v.context_sentence}&rdquo;
                          </p>
                        )}
                        {v.source_title && (
                          <p className="text-[10px] text-warm-brown-light/40 mt-0.5">
                            {v.source_title}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <button
                          onClick={() => handleToggle(v.id, v.is_memorized)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            v.is_memorized
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-vanilla/60 text-warm-brown-light hover:bg-vanilla"
                          }`}
                        >
                          {v.is_memorized ? "외웠어요 ✓" : "외웠어요"}
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-1.5 rounded-lg text-warm-brown-light/40 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-warm-brown-light/40 mt-6">
        {filtered.length}개 단어 표시 중 (전체 {initialVocab.length}개)
      </p>
    </div>
  );
}

// 날짜별 그룹핑 헬퍼
function groupByDate(items: VocabItem[]) {
  const now = new Date();
  const today = toDateStr(now);
  const yesterday = toDateStr(new Date(now.getTime() - 86400000));

  const groups: Record<string, VocabItem[]> = {};

  for (const item of items) {
    const dateStr = toDateStr(new Date(item.saved_at));
    let label: string;
    if (dateStr === today) label = "오늘";
    else if (dateStr === yesterday) label = "어제";
    else label = dateStr;

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
