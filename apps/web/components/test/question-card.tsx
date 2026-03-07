'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { DiagnosticQuestion } from '@/lib/diagnostic';
import { getLevelLabel, getTypeInstruction } from '@/lib/diagnostic';

interface QuestionCardProps {
  question: DiagnosticQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (correct: boolean) => void;
  onBack: () => void;
}

type FeedbackState = null | { selected: string; correct: boolean };

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onBack,
}: QuestionCardProps) {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const progress = (questionNumber / totalQuestions) * 100;

  // 문제 바뀌면 피드백 초기화
  useEffect(() => {
    setFeedback(null);
  }, [question.id]);

  const handleSelect = useCallback(
    (choice: string) => {
      if (feedback) return;

      const isCorrect = choice === question.answer;
      setFeedback({ selected: choice, correct: isCorrect });

      setTimeout(() => {
        onAnswer(isCorrect);
      }, 1200);
    },
    [feedback, question.answer, onAnswer],
  );

  // 문장형 독음: 한자어 부분에 밑줄
  const renderSentence = (sentence: string, word: string) => {
    const idx = sentence.indexOf(word);
    if (idx === -1) return <p className="text-lg sm:text-xl leading-relaxed">{sentence}</p>;

    const before = sentence.slice(0, idx);
    const after = sentence.slice(idx + word.length);
    return (
      <p className="text-lg sm:text-xl leading-relaxed">
        {before}
        <span className="underline decoration-tan-dark decoration-2 underline-offset-4 font-bold text-2xl sm:text-3xl">
          {word}
        </span>
        {after}
      </p>
    );
  };

  // 문제 유형별 본문 렌더링
  const renderQuestionBody = () => {
    switch (question.type) {
      case 'reading':
        // 문장형이면 문장 표시, 아니면 한자어 크게
        if (question.sentence) {
          return renderSentence(question.sentence, question.question);
        }
        return (
          <p className="text-3xl sm:text-4xl font-bold">{question.question}</p>
        );
      case 'huneum':
        return (
          <p className="text-4xl sm:text-5xl font-bold">{question.question}</p>
        );
      case 'antonym':
        return (
          <p className="text-3xl sm:text-4xl font-bold">
            {question.question} ↔ <span className="text-tan-dark">?</span>
          </p>
        );
      case 'meaning':
        return (
          <p className="text-3xl sm:text-4xl font-bold">{question.question}</p>
        );
      case 'idiom':
        return (
          <div>
            <p className="text-2xl sm:text-3xl font-bold mb-3">
              {question.question}
            </p>
            {question.hint && (
              <p className="text-sm text-warm-brown-light">
                {question.hint}
              </p>
            )}
          </div>
        );
    }
  };

  // 선택지 글씨 크기 (한자 vs 한글)
  const choiceTextClass =
    question.type === 'reading' || question.type === 'meaning'
      ? 'text-base sm:text-lg'
      : 'text-xl sm:text-2xl';

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* 캐릭터 + 급수 헤더 + 돌아가기 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Image
            src="/images/thinking.png"
            alt="책벌레"
            width={48}
            height={45}
            className="drop-shadow-sm"
          />
          <div>
            <p className="text-lg font-bold">{getLevelLabel(question.level)} 테스트</p>
            <p className="text-xs text-warm-brown-light">
              {questionNumber} / {totalQuestions} 문제
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-warm-brown-light hover:text-tan-dark transition-colors cursor-pointer"
        >
          ✕ 그만하기
        </button>
      </div>

      {/* 진행률 */}
      <div className="mb-6">
        <div className="h-2 bg-vanilla rounded-full overflow-hidden">
          <div
            className="h-full bg-tan rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* 문제 */}
      <div className="bg-vanilla/50 rounded-2xl p-6 mb-6 text-center">
        <p className="text-base sm:text-lg text-warm-brown-light mb-4 font-medium tracking-wide">
          {getTypeInstruction(question.type)}
        </p>
        {renderQuestionBody()}
      </div>

      {/* 4지선다 */}
      <div className="grid grid-cols-2 gap-3">
        {question.choices.map((choice) => {
          let btnClass =
            'flex items-center justify-center rounded-xl border-2 p-4 font-bold transition-all cursor-pointer ';
          btnClass += choiceTextClass + ' ';

          if (!feedback) {
            btnClass +=
              'border-vanilla bg-white hover:border-tan hover:bg-vanilla/30 active:scale-95';
          } else if (choice === question.answer) {
            btnClass += 'border-green-500 bg-green-50 text-green-700';
          } else if (choice === feedback.selected && !feedback.correct) {
            btnClass += 'border-red-400 bg-red-50 text-red-600';
          } else {
            btnClass += 'border-vanilla bg-white opacity-50';
          }

          return (
            <button
              key={choice}
              onClick={() => handleSelect(choice)}
              disabled={!!feedback}
              className={btnClass}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {/* 피드백 */}
      {feedback && (
        <div className="mt-4 text-center animate-in fade-in duration-300">
          {feedback.correct ? (
            <p className="text-green-600 font-bold text-lg">정답!</p>
          ) : (
            <p className="text-red-500 font-bold text-lg">
              오답! 정답: {question.answer}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
