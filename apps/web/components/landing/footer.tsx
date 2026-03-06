import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-sage py-12 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* 로고 + 캐릭터 */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/warmsmile.png"
              alt="미소짓는 책벌레"
              width={40}
              height={52}
            />
            <div>
              <span className="text-xl font-bold text-warm-brown">한자한자</span>
              <p className="mt-1 text-sm text-warm-brown-light">
                매일 읽으면서 한자 실력이 느는 크롬 확장
              </p>
            </div>
          </div>

          {/* 링크 */}
          <nav className="flex gap-6 text-sm text-warm-brown-light">
            <a href="/about" className="hover:text-warm-brown transition-colors">
              소개
            </a>
            <a href="#" className="hover:text-warm-brown transition-colors">
              이용약관
            </a>
            <a href="#" className="hover:text-warm-brown transition-colors">
              개인정보처리방침
            </a>
          </nav>
        </div>

        <div className="mt-8 border-t border-warm-brown/10 pt-6 text-center text-xs text-warm-brown-light">
          © 2025 한자한자. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
