import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://hanjahanja.co.kr";
const SITE_NAME = "한자한자";
const TITLE = "한자한자 - 매일 읽으면서 한자 실력이 느는 크롬 확장";
const DESCRIPTION =
  "평소 읽는 뉴스, 블로그 글이 자동으로 한자 교재로 변합니다. 내 수준에 맞춰, 어제 못 읽던 한자를 오늘은 읽게 됩니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: ["한자", "한자 학습", "문해력", "크롬 확장", "한자한자", "한자 급수", "한자능력검정시험"],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: TITLE,
    description: "일상 텍스트가 가장 완벽한 한자 교재가 됩니다.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: "일상 텍스트가 가장 완벽한 한자 교재가 됩니다.",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: SITE_NAME,
              url: SITE_URL,
              description: DESCRIPTION,
              applicationCategory: "EducationalApplication",
              operatingSystem: "Chrome",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "KRW",
              },
              inLanguage: "ko",
            }),
          }}
        />
      </head>
      <body className="antialiased font-[Pretendard] bg-cream text-warm-brown">
        {children}
      </body>
    </html>
  );
}
