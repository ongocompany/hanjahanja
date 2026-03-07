'use client';

import Image from 'next/image';
import { getAvailableLevels, getLevelLabel } from '@/lib/diagnostic';

interface TestIntroProps {
  onStart: (level: number) => void;
}

export function TestIntro({ onStart }: TestIntroProps) {
  const levels = getAvailableLevels();

  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src="/images/thinking.png"
        alt="고민하는 책벌레"
        width={120}
        height={113}
        className="drop-shadow-md"
      />

      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
        내 한자 실력은 <span className="text-tan-dark">몇 급</span>?
      </h1>

      <p className="mt-3 text-warm-brown-light leading-relaxed max-w-md">
        급수를 선택하면 10문제가 출제됩니다.
      </p>

      {/* 급수 선택 카드 */}
      <div className="mt-8 w-full max-w-sm space-y-3">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => onStart(level)}
            className="w-full flex items-center justify-between rounded-2xl border-2 border-vanilla bg-white px-6 py-4 shadow-sm transition-all hover:border-tan hover:bg-vanilla/30 hover:shadow-md active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl font-bold text-base shadow-sm"
                style={{ backgroundColor: '#D4A373', color: '#FEFAE0' }}
              >
                {getLevelLabel(level)}
              </div>
              <span className="text-sm text-warm-brown-light">10문제</span>
            </div>
            <span className="text-tan-dark text-lg">→</span>
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-warm-brown-light">
        로그인 불필요 · 급수별 약 2분 소요
      </p>
    </div>
  );
}
