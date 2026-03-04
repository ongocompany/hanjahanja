import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "한자한자 - 일상 텍스트가 한자 교재가 됩니다",
  description:
    "평소 읽는 뉴스, 블로그 글이 자동으로 한자 교재로 변합니다. 크롬 확장 프로그램으로 자연스럽게 한자를 학습하세요.",
  keywords: ["한자", "한자 학습", "문해력", "크롬 확장", "한자한자"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
