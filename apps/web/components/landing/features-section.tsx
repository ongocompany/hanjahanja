import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    image: "/images/default.png",
    imageAlt: "기본 책벌레",
    imageSize: { w: 70, h: 93 },
    title: "내 수준에 맞는 변환",
    description:
      "8급부터 특급까지, 내가 아는 급수 범위만 변환. 너무 쉽지도, 너무 어렵지도 않게.",
  },
  {
    image: "/images/studying.png",
    imageAlt: "공부하는 책벌레",
    imageSize: { w: 90, h: 77 },
    title: "어제 본 한자, 오늘 또 만난다",
    description:
      "한번 본 한자어를 다른 글에서 다시 노출. 자연스러운 반복 학습 + 진도 리포트.",
  },
  {
    image: "/images/thinking.png",
    imageAlt: "생각하는 책벌레",
    imageSize: { w: 80, h: 75 },
    title: "AI가 골라주는 정확한 한자",
    description:
      "\"전기\"가 電氣인지 前期인지, 문맥을 읽고 맞는 한자를 자동 선택.",
  },
  {
    image: "/images/missioncomplete.png",
    imageAlt: "미션완료 책벌레",
    imageSize: { w: 70, h: 77 },
    title: "클릭 한 번으로 단어장",
    description:
      "모르는 한자어를 클릭하면 문장째 저장. 나중에 꺼내서 복습.",
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-cream py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          어제의 나보다 오늘 더 읽을 수 있게
        </h2>
        <p className="mt-2 text-center text-warm-brown-light text-base">
          단순 변환기가 아닌, 매일 쓸수록 실력이 느는 <strong className="text-warm-brown">개인화 학습 시스템</strong>
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
