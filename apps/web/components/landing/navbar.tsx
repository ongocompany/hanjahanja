import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-warm-brown/5">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-3">
        {/* 로고 */}
        <Link href="/" className="text-xl font-bold text-warm-brown">
          한자한자
        </Link>

        {/* 메뉴 */}
        <nav className="flex items-center gap-6">
          <Link
            href="/guide"
            className="text-sm font-medium text-warm-brown-light hover:text-warm-brown transition-colors"
          >
            사용방법
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-warm-brown-light hover:text-warm-brown transition-colors"
          >
            한자한자 소개
          </Link>
          <Button
            asChild
            size="sm"
            className="bg-tan hover:bg-tan-dark text-cream rounded-lg"
          >
            <Link href="/signup">회원가입</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
