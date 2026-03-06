import Image from "next/image";
import { Button } from "@/components/ui/button";

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
              내 진짜 문해력은{" "}
              <span className="text-tan-dark">몇 급</span>?
            </h2>
          </div>
        </div>

        <p className="mt-4 text-base text-warm-brown-light leading-relaxed">
          2분이면 충분합니다. 내 한자 실력을 진단하고, 딱 맞는 급수부터 시작하세요.
        </p>

        {/* 급수 프리뷰 */}
        <div className="mt-6 flex justify-center gap-3">
          {["8급", "6급", "4급", "2급", "특급"].map((lvl, i) => (
            <div
              key={lvl}
              className="flex h-12 w-12 items-center justify-center rounded-xl font-bold text-sm shadow-sm"
              style={{
                backgroundColor: i === 0 ? "#D4A373" : "#FAEDCD",
                color: i === 0 ? "#FEFAE0" : "#6B5744",
                opacity: 1 - i * 0.12,
              }}
            >
              {lvl}
            </div>
          ))}
        </div>

        <Button
          size="lg"
          className="mt-8 bg-tan hover:bg-tan-dark text-cream px-10 py-5 text-base font-semibold rounded-xl shadow-lg"
        >
          지금 테스트 시작하기
        </Button>

        <p className="mt-3 text-sm text-warm-brown-light">
          로그인 없이 바로 시작 · 결과 SNS 공유 가능
        </p>
      </div>
    </section>
  );
}
