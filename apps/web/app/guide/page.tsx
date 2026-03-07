import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import {
  ClipboardCheck,
  Puzzle,
  Globe,
  MousePointerClick,
  BookmarkPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEPS: {
  number: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  description: string;
  detail?: string;
  cta?: { label: string; href: string };
  demo?: {
    before: string;
    after: { text: string; ruby?: string }[];
  };
  bgColor: string;
}[] = [
  {
    number: 1,
    icon: ClipboardCheck,
    iconBg: "bg-tan/20",
    iconColor: "text-tan-dark",
    title: "내 한자 실력 확인하기",
    subtitle: "무료 진단 테스트",
    description:
      "급수별 10문제를 풀면 내 한자 실력이 어느 정도인지 바로 알 수 있어요. 독음, 훈음, 반의어 등 다양한 유형의 문제가 출제됩니다.",
    detail: "8급(가장 쉬움)부터 4급까지, 어문회 급수 기준으로 측정합니다.",
    cta: { label: "지금 테스트 해보기", href: "/test" },
    bgColor: "bg-vanilla/60",
  },
  {
    number: 2,
    icon: Puzzle,
    iconBg: "bg-sage/40",
    iconColor: "text-warm-brown",
    title: "크롬 확장 프로그램 설치",
    subtitle: "10초면 끝",
    description:
      "크롬 웹 스토어에서 '한자한자'를 검색하고 설치하세요. 설치 후 팝업에서 내 급수를 설정하면 준비 완료!",
    detail:
      "8급~특급까지 15단계 급수를 선택할 수 있어요. 내 실력에 맞는 한자어만 변환됩니다.",
    bgColor: "bg-moss/40",
  },
  {
    number: 3,
    icon: Globe,
    iconBg: "bg-tan/20",
    iconColor: "text-tan-dark",
    title: "평소처럼 웹서핑하기",
    subtitle: "뉴스, 커뮤니티, 블로그... 어디서든",
    description:
      "네이버 뉴스, 에펨코리아, 블로그 등 평소 읽던 글을 그대로 읽으세요. 한자어가 자동으로 한자로 변환되어 있습니다.",
    demo: {
      before: "경제 위기 속에서도 교육의 중요성은 변하지 않는다.",
      after: [
        { text: "經濟", ruby: "경제" },
        { text: " 危機", ruby: "위기" },
        { text: " 속에서도 " },
        { text: "敎育", ruby: "교육" },
        { text: "의 " },
        { text: "重要性", ruby: "중요성" },
        { text: "은 변하지 않는다." },
      ],
    },
    bgColor: "bg-vanilla/60",
  },
  {
    number: 4,
    icon: MousePointerClick,
    iconBg: "bg-sage/40",
    iconColor: "text-warm-brown",
    title: "마우스를 올려 힌트 확인",
    subtitle: "루비 모드",
    description:
      "변환된 한자가 헷갈릴 때, 마우스를 올리면 한글 발음과 뜻이 바로 뜹니다. 읽기 흐름이 끊기지 않아요.",
    detail:
      "AI가 문맥을 분석해서 동음이의어도 정확하게 구분합니다. '사기(詐欺)'와 '사기(士氣)'를 자동으로 판별해요.",
    bgColor: "bg-moss/40",
  },
  {
    number: 5,
    icon: BookmarkPlus,
    iconBg: "bg-tan/20",
    iconColor: "text-tan-dark",
    title: "단어장에 저장하기",
    subtitle: "우클릭 한 번이면 끝",
    description:
      "외우고 싶은 한자어를 발견하면, 우클릭 → '한자한자 단어장에 추가'를 누르세요. 해당 문장까지 함께 저장됩니다.",
    detail:
      "문맥과 함께 저장되니까, 나중에 복습할 때 어떤 상황에서 쓰인 단어인지 바로 떠올릴 수 있어요.",
    bgColor: "bg-vanilla/60",
  },
];

function RubyText({ base, reading }: { base: string; reading: string }) {
  return (
    <ruby className="inline-flex flex-col items-center">
      <span className="text-tan-dark font-semibold">{base}</span>
      <rp>(</rp>
      <rt className="text-[0.6em] text-warm-brown-light font-normal">
        {reading}
      </rt>
      <rp>)</rp>
    </ruby>
  );
}

export default function GuidePage() {
  return (
    <>
      <Navbar />
      <main className="bg-cream min-h-screen">
        {/* 히어로 */}
        <section className="pt-28 pb-12 px-6">
          <div className="mx-auto max-w-3xl flex items-center gap-6 sm:gap-10">
            <Image
              src="/images/explaning.svg"
              alt="설명하는 책벌레"
              width={180}
              height={180}
              className="shrink-0 drop-shadow-md hidden sm:block"
            />
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
                사용방법
              </h1>
              <p className="mt-4 text-lg text-warm-brown-light leading-relaxed">
                뉴스 읽는 시간이 한자 공부 시간이 됩니다.
                <br />
                <strong className="text-warm-brown">5단계</strong>만 따라하면
                바로 시작할 수 있어요.
              </p>
            </div>
          </div>
        </section>

        {/* 스텝 카드들 */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-3xl space-y-6">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className={`rounded-2xl ${step.bgColor} p-6 sm:p-8`}
                >
                  {/* 스텝 번호 + 서브타이틀 */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tan text-cream text-sm font-bold shrink-0">
                      {step.number}
                    </span>
                    <span className="text-sm font-semibold text-tan-dark tracking-wide">
                      {step.subtitle}
                    </span>
                  </div>

                  {/* 본문 */}
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    {/* 아이콘 */}
                    <div
                      className={`flex h-20 w-20 items-center justify-center rounded-2xl ${step.iconBg} shrink-0 mx-auto sm:mx-0`}
                    >
                      <Icon className={`h-10 w-10 ${step.iconColor}`} strokeWidth={1.5} />
                    </div>

                    <div className="flex-1">
                      <h2 className="text-xl font-bold sm:text-2xl">
                        {step.title}
                      </h2>
                      <p className="mt-2 text-base text-warm-brown-light leading-relaxed">
                        {step.description}
                      </p>

                      {/* 부가 설명 */}
                      {step.detail && (
                        <p className="mt-3 text-sm text-warm-brown-light/80 leading-relaxed border-l-2 border-tan/40 pl-3">
                          {step.detail}
                        </p>
                      )}

                      {/* 변환 데모 (Step 3) */}
                      {step.demo && (
                        <div className="mt-4 space-y-2">
                          <div className="rounded-xl bg-white/60 p-4">
                            <span className="text-xs font-semibold text-warm-brown-light/60 uppercase">
                              Before
                            </span>
                            <p className="mt-1 text-base leading-relaxed">
                              {step.demo.before}
                            </p>
                          </div>
                          <div className="rounded-xl bg-white p-4 ring-1 ring-tan/30">
                            <span className="text-xs font-semibold text-tan-dark uppercase">
                              After
                            </span>
                            <p className="mt-1 text-base leading-relaxed">
                              {step.demo.after.map((seg, i) =>
                                seg.ruby ? (
                                  <RubyText
                                    key={i}
                                    base={seg.text}
                                    reading={seg.ruby}
                                  />
                                ) : (
                                  <span key={i}>{seg.text}</span>
                                )
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* CTA 버튼 */}
                      {step.cta && (
                        <Link
                          href={step.cta.href}
                          className="mt-4 inline-block rounded-xl bg-tan px-6 py-2.5 text-sm font-semibold text-cream hover:bg-tan-dark transition-colors"
                        >
                          {step.cta.label}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 하단 CTA */}
        <section className="bg-gradient-to-b from-cream to-vanilla py-16 px-6 text-center">
          <div className="mx-auto max-w-2xl">
            <Image
              src="/images/yeah.png"
              alt="신나는 책벌레"
              width={100}
              height={100}
              className="mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold sm:text-3xl">
              지금 바로 시작해보세요!
            </h2>
            <p className="mt-3 text-base text-warm-brown-light">
              매일 읽는 뉴스와 게시판이 나만의 한자 교재가 됩니다.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/test"
                className="rounded-xl bg-tan px-8 py-3 text-base font-semibold text-cream hover:bg-tan-dark transition-colors shadow-lg"
              >
                내 한자 실력 테스트
              </Link>
              <a
                href="#"
                className="rounded-xl border-2 border-tan px-8 py-3 text-base font-semibold text-tan-dark hover:bg-vanilla transition-colors"
              >
                크롬에 추가하기
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
