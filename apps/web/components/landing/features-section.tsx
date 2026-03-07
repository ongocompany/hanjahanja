import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    image: "/images/default.png",
    imageAlt: "기본 책벌레",
    imageSize: { w: 70, h: 93 },
    title: "지겹게 쓰기만 한다고 한자 실력이 늘까요?",
    description:
      "조금 귀찮아도 자꾸 보면, 자연스럽게 읽을 수 있는 순간이 옵니다. 어느 순간 자연스럽게 한자를 읽고 있는 자신을 발견하게 됩니다.",
  },
  {
    image: "/images/studying.png",
    imageAlt: "공부하는 책벌레",
    imageSize: { w: 90, h: 77 },
    title: "AI가 나만의 한자 훈장님",
    description:
      "문맥을 읽고 정확한 한자를 골라서 알려줍니다. 동음이의어 및 문맥 판별을 위해 별도로 학습된 AI가 내 한자공부의 도우미가 되어줍니다.",
  },
  {
    image: "/images/thinking.png",
    imageAlt: "생각하는 책벌레",
    imageSize: { w: 80, h: 75 },
    title: "클릭! 한번으로 나만의 단어장을",
    description:
      "이 단어가 이런 한자였어? 늘 쓰던 말의 한자를 알게되면 저장하세요. 나만의 단어장에 저장되어 문제로 만들어드립니다.",
  },
  {
    image: "/images/missioncomplete.png",
    imageAlt: "미션완료 책벌레",
    imageSize: { w: 70, h: 77 },
    title: "내 수준에 맞는 맞춤형 변환 시스템",
    description:
      "한국어문회 급에 맞춰 8급부터 특급까지 자신의 실력에 맞는 변환이 가능합니다. 실력향상에 따라 맞춤형 변환을 선택하세요.",
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-cream py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          뉴스보고 게시판 보는 시간이 내 한자 공부 시간이 됩니다
        </h2>
        <p className="mt-2 text-center text-warm-brown-light text-base">
          AI와 개인별 맞춤 콘텐츠로 매일 매일 조금씩 상승하는 한자 실력
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="border-0 bg-white/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <Image
                  src={feature.image}
                  alt={feature.imageAlt}
                  width={feature.imageSize.w}
                  height={feature.imageSize.h}
                  className="shrink-0 drop-shadow-sm"
                />
                <div>
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-warm-brown-light leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
