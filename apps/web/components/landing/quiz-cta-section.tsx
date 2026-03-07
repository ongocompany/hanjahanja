import Image from "next/image";
import Link from "next/link";

// 문제가 있는 급수만 활성화
const ACTIVE_LEVELS = new Set([8, 7, 6, 5, 4]);

const LEVELS: { label: string; value: number }[][] = [
  [
    { label: "8급", value: 8 },
    { label: "준7급", value: 7.5 },
    { label: "7급", value: 7 },
    { label: "준6급", value: 6.5 },
    { label: "6급", value: 6 },
  ],
  [
    { label: "준5급", value: 5.5 },
    { label: "5급", value: 5 },
    { label: "준4급", value: 4.5 },
    { label: "4급", value: 4 },
    { label: "3급", value: 3 },
  ],
];

export function QuizCtaSection() {
  return (
    <section className="relative bg-gradient-to-b from-vanilla to-tan/30 py-16 px-6">
      <div className="mx-auto max-w-3xl text-center">
        {/* 캐릭터 + 타이틀 */}
        <div className="flex items-center justify-center gap-4">
          <Image
            src="/images/thinking.png"
            alt="고민하는 책벌레"
            width={100}
            height={94}
            className="drop-shadow-md"
          />
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-tan-dark">
              무료 진단 테스트
            </p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl lg:text-4xl">
              나의 <span className="text-tan-dark">한자실력</span>은?
            </h2>
          </div>
        </div>

        <p className="mt-4 text-base text-warm-brown-light leading-relaxed">
          급수를 선택하고 10문제를 풀어보세요. 내 실력을 바로 확인할 수 있습니다.
        </p>

        {/* 급수 선택 (2줄) */}
        <div className="mt-6 space-y-2">
          {LEVELS.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-2">
              {row.map((lvl) => {
                const active = ACTIVE_LEVELS.has(lvl.value);
                if (active) {
                  return (
                    <Link
                      key={lvl.label}
                      href={`/test?level=${lvl.value}`}
                      className="flex h-11 w-14 items-center justify-center rounded-xl font-bold text-xs shadow-sm transition-all hover:scale-105 hover:shadow-md cursor-pointer bg-[#FAEDCD] text-[#6B5744] hover:bg-tan hover:text-cream"
                    >
                      {lvl.label}
                    </Link>
                  );
                }
                return (
                  <div
                    key={lvl.label}
                    className="flex h-11 w-14 items-center justify-center rounded-xl font-bold text-xs shadow-sm bg-[#FAEDCD]/50 text-[#6B5744]/40"
                    title="준비 중"
                  >
                    {lvl.label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <p className="mt-5 text-sm text-warm-brown-light">
          로그인 없이 바로 시작 · 급수별 약 2분 소요
        </p>
      </div>
    </section>
  );
}
