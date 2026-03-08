"use client";

import { useState } from "react";

/* 급수별 예시 데이터: 같은 문장을 다른 급수 범위로 변환 */
const EXAMPLES: Record<string, { before: string; after: React.ReactNode }> = {
  "8급": {
    before: "대한민국의 경제 발전은 교육의 힘에서 시작되었다.",
    after: (
      <>
        <Ruby base="大韓民國" reading="대한민국" />의{" "}
        <Ruby base="經濟" reading="경제" /> <Ruby base="發展" reading="발전" />
        은 <Ruby base="敎育" reading="교육" />의{" "}
        <Ruby base="力" reading="힘" />에서{" "}
        <Ruby base="始作" reading="시작" />되었다.
      </>
    ),
  },
  "6급": {
    before: "국회에서 새로운 법률안을 심의하고 있다.",
    after: (
      <>
        <Ruby base="國會" reading="국회" />에서 새로운{" "}
        <Ruby base="法律案" reading="법률안" />을{" "}
        <Ruby base="審議" reading="심의" />하고 있다.
      </>
    ),
  },
  "4급": {
    before: "그의 탁월한 외교 수완은 국제 사회에서 인정받았다.",
    after: (
      <>
        그의 <Ruby base="卓越" reading="탁월" />한{" "}
        <Ruby base="外交" reading="외교" />{" "}
        <Ruby base="手腕" reading="수완" />은{" "}
        <Ruby base="國際" reading="국제" />{" "}
        <Ruby base="社會" reading="사회" />에서{" "}
        <Ruby base="認定" reading="인정" />받았다.
      </>
    ),
  },
};

function Ruby({ base, reading }: { base: string; reading: string }) {
  return (
    <ruby className="inline-flex flex-col items-center">
      <span className="text-tan-dark font-semibold">{base}</span>
      <rp>(</rp>
      <rt className="text-[0.65em] text-warm-brown-light font-normal">
        {reading}
      </rt>
      <rp>)</rp>
    </ruby>
  );
}

export function BeforeAfterSection() {
  const [level, setLevel] = useState("8급");
  const example = EXAMPLES[level];

  return (
    <section className="bg-moss py-10 px-6 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-xl font-bold sm:text-2xl lg:text-3xl">
          네이버 뉴스에 한자가?
        </h2>
        <p className="mt-2 text-center text-warm-brown-light text-base">
          내 급수에 맞춰, 아는 만큼만 보여줍니다
        </p>

        {/* 급수 탭 */}
        <div className="mt-6 flex justify-center gap-2">
          {Object.keys(EXAMPLES).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevel(lvl)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                level === lvl
                  ? "bg-tan text-cream shadow-md"
                  : "bg-cream/60 text-warm-brown hover:bg-cream"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Before / After 카드 */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Before */}
          <div className="rounded-2xl bg-white/50 p-6 shadow-sm">
            <span className="inline-block rounded-full bg-warm-brown/10 px-3 py-1 text-xs font-semibold text-warm-brown-light mb-4">
              BEFORE
            </span>
            <p className="text-lg leading-relaxed">{example.before}</p>
          </div>

          {/* After */}
          <div className="rounded-2xl bg-white p-6 shadow-md ring-2 ring-tan/30">
            <span className="inline-block rounded-full bg-tan/20 px-3 py-1 text-xs font-semibold text-tan-dark mb-4">
              AFTER
            </span>
            <p className="text-lg leading-relaxed">{example.after}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
