import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import {
  Eye,
  MousePointerClick,
  ClipboardList,
  RotateCcw,
  Sparkles,
  BookOpen,
  RefreshCw,
  Cpu,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── How it works 4단계 ── */
const STEPS: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}[] = [
  {
    icon: Eye,
    iconBg: "bg-tan/20",
    iconColor: "text-tan-dark",
    title: "내 수준에 맞춘 자동 변환",
    description:
      "웹페이지의 한글 표현을 사용자의 수준에 맞춰 한자로 변환합니다.",
  },
  {
    icon: MousePointerClick,
    iconBg: "bg-sage/40",
    iconColor: "text-warm-brown",
    title: "모르면 클릭해서 바로 확인",
    description:
      "독해가 막히는 한자어는 클릭 한 번으로 음과 훈을 확인할 수 있습니다.",
  },
  {
    icon: ClipboardList,
    iconBg: "bg-tan/20",
    iconColor: "text-tan-dark",
    title: "학습 이력 자동 기록",
    description:
      "그날 노출된 한자어 수와 클릭해 확인한 한자어 수가 자동으로 기록됩니다.",
  },
  {
    icon: RotateCcw,
    iconBg: "bg-sage/40",
    iconColor: "text-warm-brown",
    title: "다음날 복습과 퀴즈",
    description:
      "전날의 노출 이력을 바탕으로 1~10개의 단어가 다시 노출되고, 관련 퀴즈가 제공됩니다.",
  },
];

/* ── Strength 4가지 ── */
const STRENGTHS: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}[] = [
  {
    icon: Sparkles,
    iconBg: "bg-tan/20",
    iconColor: "text-tan-dark",
    title: "자연 노출형 학습",
    description: "웹서핑 자체가 학습이 됩니다.",
  },
  {
    icon: BookOpen,
    iconBg: "bg-sage/40",
    iconColor: "text-warm-brown",
    title: "문맥 중심 독해 학습",
    description: "단어만 외우지 않고 실제 문장 속에서 익힙니다.",
  },
  {
    icon: MousePointerClick,
    iconBg: "bg-tan/20",
    iconColor: "text-tan-dark",
    title: "즉시 확인 가능한 구조",
    description: "모르면 멈추지 않고 바로 확인하고 넘어갈 수 있습니다.",
  },
  {
    icon: RefreshCw,
    iconBg: "bg-sage/40",
    iconColor: "text-warm-brown",
    title: "반복을 만드는 시스템",
    description: "오늘 본 단어가 내일의 복습으로 이어집니다.",
  },
];

/* ── Audience 대상 ── */
const AUDIENCES = [
  "한자를 외웠는데 실제 글 읽기에는 잘 안 붙는 분",
  "신문·칼럼·인문 글을 읽으며 한자어 감각을 키우고 싶은 분",
  "고전, 역사, 한문, 동양 사상 분야에 관심 있는 학습자",
  "억지 암기보다 자연 노출형 학습을 선호하는 분",
];

/* ── 변환 데모 ── */
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

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="bg-cream min-h-screen">
        {/* ── 1. Hero ── */}
        <section className="pt-28 pb-16 px-6">
          <div className="mx-auto max-w-3xl flex items-center gap-6 sm:gap-10">
            <Image
              src="/images/whiteboard.svg"
              alt="칠판 앞 책벌레"
              width={180}
              height={180}
              className="shrink-0 drop-shadow-md hidden sm:block"
            />
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl leading-tight">
                웹을 읽다 보면,
                <br />
                한자가 쌓입니다
              </h1>
              <p className="mt-4 text-lg text-warm-brown-light leading-relaxed">
                한자한자는 웹사이트에 보이는 한글을 사용자의 수준에 맞춰 한자로
                자동 변환해 주는 크롬 익스텐션입니다.
                <br />
                낯선 한자어는 클릭해서 음훈을 바로 확인하고, 그날 노출된 단어를
                바탕으로 다음날 복습과 퀴즈까지 이어집니다.
              </p>
              <p className="mt-3 text-base font-semibold text-warm-brown">
                억지 암기보다, 자연 노출과 반복.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href="#"
                  className="rounded-xl bg-tan px-6 py-2.5 text-sm font-semibold text-cream hover:bg-tan-dark transition-colors text-center"
                >
                  크롬에서 시작하기
                </a>
                <a
                  href="#how-it-works"
                  className="rounded-xl border-2 border-tan px-6 py-2.5 text-sm font-semibold text-tan-dark hover:bg-vanilla transition-colors text-center"
                >
                  기능 자세히 보기
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Problem ── */}
        <section className="py-16 px-6 bg-vanilla/60">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-start gap-6">
              <Image
                src="/images/exhausted.svg"
                alt="지친 책벌레"
                width={120}
                height={120}
                className="shrink-0 hidden sm:block mt-2"
              />
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  한자는 외워도, 읽지 않으면 남지 않습니다
                </h2>
                <p className="mt-4 text-base text-warm-brown-light leading-relaxed">
                  많은 한자 공부는 단어를 외우는 데서 끝납니다.
                  <br />
                  하지만 실제 독해력은 문맥 속에서 반복해서 만나야 생깁니다.
                </p>
                <p className="mt-4 text-base text-warm-brown-light leading-relaxed">
                  한자한자는 사용자가 원래 보던 웹페이지 안에 한자를 자연스럽게
                  노출해 모르면 바로 확인하고, 다음날 다시 만나고, 퀴즈로
                  정리하게 만듭니다.
                </p>
                <p className="mt-4 text-base font-semibold text-warm-brown">
                  한자를 따로 공부하는 것이 아니라, 읽는 시간 속에서 익히게
                  합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. How it works ── */}
        <section id="how-it-works" className="py-16 px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold sm:text-3xl text-center mb-10">
              읽는 흐름을 끊지 않는 4단계 학습
            </h2>

            <div className="space-y-4">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={i}
                    className={`rounded-2xl ${i % 2 === 0 ? "bg-vanilla/60" : "bg-moss/40"} p-6 sm:p-8`}
                  >
                    <div className="flex items-start gap-5">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${step.iconBg} shrink-0`}
                      >
                        <Icon
                          className={`h-7 w-7 ${step.iconColor}`}
                          strokeWidth={1.5}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tan text-cream text-xs font-bold shrink-0">
                            {i + 1}
                          </span>
                          <h3 className="text-lg font-bold">{step.title}</h3>
                        </div>
                        <p className="text-base text-warm-brown-light leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 변환 데모 */}
            <div className="mt-8 space-y-2">
              <p className="text-sm font-semibold text-warm-brown-light/60 text-center mb-3">
                이런 식으로 변환됩니다
              </p>
              <div className="rounded-xl bg-white/60 p-4">
                <span className="text-xs font-semibold text-warm-brown-light/60 uppercase">
                  Before
                </span>
                <p className="mt-1 text-base leading-relaxed">
                  경제 위기 속에서도 교육의 중요성은 변하지 않는다.
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-tan/30">
                <span className="text-xs font-semibold text-tan-dark uppercase">
                  After
                </span>
                <p className="mt-1 text-base leading-relaxed">
                  <RubyText base="經濟" reading="경제" />
                  {" "}
                  <RubyText base="危機" reading="위기" />
                  {" 속에서도 "}
                  <RubyText base="敎育" reading="교육" />
                  {"의 "}
                  <RubyText base="重要性" reading="중요성" />
                  {"은 변하지 않는다."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Strength ── */}
        <section className="py-16 px-6 bg-moss/40">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold sm:text-3xl text-center mb-10">
              한자한자가 다른 이유
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {STRENGTHS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={i}
                    className="rounded-2xl bg-white/70 p-6 flex items-start gap-4"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.iconBg} shrink-0`}
                    >
                      <Icon
                        className={`h-6 w-6 ${s.iconColor}`}
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <h3 className="text-base font-bold">{s.title}</h3>
                      <p className="mt-1 text-sm text-warm-brown-light leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 5. Technology ── */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-start gap-6">
              <Image
                src="/images/thinking.png"
                alt="생각하는 책벌레"
                width={120}
                height={120}
                className="shrink-0 hidden sm:block mt-2"
              />
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  문맥을 읽고, 알맞은 한자를 고릅니다
                </h2>
                <p className="mt-4 text-base text-warm-brown-light leading-relaxed">
                  한국어 한자어 변환은 단순 치환으로 해결되지 않습니다.
                  <br />
                  동음이의어가 많기 때문에 문맥을 읽지 못하면 잘못된 한자 표기가
                  발생합니다.
                </p>
                <p className="mt-4 text-base text-warm-brown-light leading-relaxed">
                  한자한자는{" "}
                  <strong className="text-warm-brown">
                    100만 건에 가까운 문서로 학습한 자체 언어 모델
                  </strong>
                  을 통해 문맥에 맞는 한자어를 실시간 API 방식으로 변환합니다.
                  <br />
                  그래서 더 자연스럽고, 실제 독해에 적합한 결과를 제공합니다.
                </p>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-vanilla/80 p-4">
                  <Cpu
                    className="h-8 w-8 text-tan-dark shrink-0"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm font-semibold text-warm-brown">
                    동음이의어까지 고려하는 문맥 기반 한자 변환.
                    <br />
                    이것이 한자한자의 핵심 기술입니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. Personalization ── */}
        <section className="py-16 px-6 bg-vanilla/60">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-start gap-6">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  쓰면 쓸수록, 나에게 맞게 쌓입니다
                </h2>
                <p className="mt-4 text-base text-warm-brown-light leading-relaxed">
                  한자한자는 사용자의 실제 학습 흐름을 기록하고 반영합니다.
                  <br />
                  노출된 단어, 클릭한 단어, 다시 보고 싶은 단어가 쌓이면서
                  개인 단어장과 맞춤 복습이 만들어집니다.
                </p>
                <p className="mt-4 text-base font-semibold text-warm-brown">
                  모든 사용자가 같은 단어를 외우는 것이 아니라,
                  <br />
                  내가 실제로 읽다가 만난 단어를 중심으로 학습이 이어집니다.
                </p>
              </div>
              <Image
                src="/images/studying.png"
                alt="공부하는 책벌레"
                width={120}
                height={120}
                className="shrink-0 hidden sm:block mt-2"
              />
            </div>
          </div>
        </section>

        {/* ── 7. Audience ── */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-start gap-6">
              <Image
                src="/images/curiosity.svg"
                alt="궁금한 책벌레"
                width={120}
                height={120}
                className="shrink-0 hidden sm:block mt-2"
              />
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl mb-6">
                  이런 분께 잘 맞습니다
                </h2>
                <ul className="space-y-3">
                  {AUDIENCES.map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <User
                        className="h-5 w-5 text-tan-dark shrink-0 mt-0.5"
                        strokeWidth={1.5}
                      />
                      <span className="text-base text-warm-brown-light leading-relaxed">
                        {text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. CTA ── */}
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
              읽는 습관을, 한자 실력으로 바꾸세요
            </h2>
            <p className="mt-4 text-base text-warm-brown-light leading-relaxed">
              한자한자는 새로운 공부 시간을 강요하지 않습니다.
              <br />
              당신이 이미 읽고 있는 웹페이지를,
              <br />
              당신에게 맞는 한자 학습 환경으로 바꿔줍니다.
            </p>
            <p className="mt-4 text-sm text-warm-brown-light">
              오늘 읽은 문장이 내일의 복습이 되고,
              <br />
              반복된 노출이 자연스럽게 실력이 됩니다.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#"
                className="rounded-xl bg-tan px-8 py-3 text-base font-semibold text-cream hover:bg-tan-dark transition-colors shadow-lg"
              >
                크롬 익스텐션 설치하기
              </a>
              <Link
                href="/test"
                className="rounded-xl border-2 border-tan px-8 py-3 text-base font-semibold text-tan-dark hover:bg-vanilla transition-colors"
              >
                내 한자 실력 테스트
              </Link>
            </div>
            <p className="mt-4 text-sm text-warm-brown-light/70 font-medium">
              웹을 읽다 보면, 한자가 남습니다
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
