import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="mx-auto max-w-5xl px-6 pt-28 pb-24">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-12">
          {/* 캐릭터 — 왼쪽 */}
          <div className="shrink-0">
            <Image
              src="/images/main.png"
              alt="한자한자 캐릭터 - 책벌레"
              width={240}
              height={276}
              priority
              className="drop-shadow-lg"
            />
          </div>

          {/* 텍스트 — 오른쪽 */}
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
              당신의 일상 텍스트가
              <br />
              <span className="text-tan-dark">가장 완벽한 한자 교재</span>가 됩니다
            </h1>

            <p className="mt-4 max-w-lg text-base text-warm-brown-light sm:text-lg leading-relaxed">
              매일 읽는 뉴스와 글 속에서,{" "}
              <strong className="text-warm-brown">
                어제 못 읽던 한자를 오늘은 읽게 됩니다.
              </strong>
              <br className="hidden sm:block" />
              내 수준에 맞춰 조금씩, 자연스럽게.
            </p>

            {/* 키워드 뱃지 */}
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant="secondary" className="bg-moss text-warm-brown px-3 py-1 text-sm font-medium">
                맞춤 급수
              </Badge>
              <Badge variant="secondary" className="bg-vanilla text-warm-brown px-3 py-1 text-sm font-medium">
                진도 추적
              </Badge>
              <Badge variant="secondary" className="bg-sage text-warm-brown px-3 py-1 text-sm font-medium">
                반복 노출 학습
              </Badge>
            </div>

            {/* CTA 버튼 */}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <Button
                size="lg"
                className="bg-tan hover:bg-tan-dark text-cream px-8 py-5 text-base font-semibold rounded-xl shadow-lg"
              >
                크롬에 추가하기
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-tan text-tan-dark hover:bg-vanilla px-8 py-5 text-base font-semibold rounded-xl"
              >
                내 한자 실력 테스트
              </Button>
            </div>

            <p className="mt-3 text-sm text-warm-brown-light sm:text-left text-center">
              무료로 시작 · 8급~4급 완전 무료
            </p>
          </div>
        </div>
      </div>

      {/* 하단 웨이브 장식 */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0 60V20C240 0 480 40 720 30C960 20 1200 0 1440 20V60H0Z"
            fill="#E9EDC9"
          />
        </svg>
      </div>
    </section>
  );
}
