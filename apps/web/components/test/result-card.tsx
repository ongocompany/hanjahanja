'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { AnswerRecord } from '@/lib/diagnostic';
import { getLevelLabel } from '@/lib/diagnostic';

interface ResultCardProps {
  level: number;
  answers: AnswerRecord[];
  onBack: () => void;
}

export function ResultCard({ level, answers, onBack }: ResultCardProps) {
  const correct = answers.filter((a) => a.correct).length;
  const total = answers.length;
  const rate = Math.round((correct / total) * 100);

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      {/* 급수 + 점수 */}
      <div className="mb-8">
        <p className="text-sm text-warm-brown-light mb-3">
          {getLevelLabel(level)} 테스트 결과
        </p>
        <div
          className="inline-flex items-center justify-center w-32 h-32 rounded-full shadow-lg"
          style={{
            backgroundColor: rate >= 70 ? '#7CB342' : rate >= 40 ? '#D4A373' : '#E8CEBF',
            color: '#FEFAE0',
          }}
        >
          <div>
            <p className="text-4xl font-black">{correct}/{total}</p>
            <p className="text-sm font-bold opacity-80">{rate}%</p>
          </div>
        </div>
      </div>

      {/* 한줄 평 */}
      <p className="text-lg font-bold mb-2">
        {rate >= 90
          ? '훌륭합니다! 이 급수는 마스터했네요.'
          : rate >= 70
            ? '좋아요! 조금만 더 연습하면 완벽해요.'
            : rate >= 40
              ? '기본은 잡혀 있어요. 복습이 필요합니다.'
              : '이 급수부터 차근차근 공부해 보세요!'}
      </p>

      <p className="text-sm text-warm-brown-light mb-8">
        회원가입하고 나에게 맞는 급수부터 학습을 시작하세요!
      </p>

      {/* CTA */}
      <div className="space-y-5">
        <Link href="/signup">
          <Button
            size="lg"
            className="w-full bg-tan hover:bg-tan-dark text-cream py-6 text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all"
          >
            회원가입하기
          </Button>
        </Link>
        <Button
          variant="outline"
          size="lg"
          onClick={onBack}
          className="w-full py-6 text-lg rounded-2xl"
        >
          처음으로
        </Button>
      </div>
    </div>
  );
}
