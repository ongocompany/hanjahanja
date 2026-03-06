import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "한자한자 - 매일 읽으면서 한자 실력이 느는 크롬 확장",
  description:
    "평소 읽는 뉴스, 블로그 글이 자동으로 한자 교재로 변합니다. 내 수준에 맞춰, 어제 못 읽던 한자를 오늘은 읽게 됩니다.",
  keywords: ["한자", "한자 학습", "문해력", "크롬 확장", "한자한자", "한자 급수"],
  openGraph: {
    title: "한자한자 - 매일 읽으면서 한자 실력이 느는 크롬 확장",
    description: "일상 텍스트가 가장 완벽한 한자 교재가 됩니다.",
    url: "https://hanjahanja.kr",
    siteName: "한자한자",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased font-[Pretendard] bg-cream text-warm-brown">
        {children}
      </body>
    </html>
  );
}
