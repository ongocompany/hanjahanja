'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  createInitialState,
  startTest,
  processAnswer,
  getCurrentQuestion,
  type DiagnosticState,
} from '@/lib/diagnostic';
import { QuestionCard } from '@/components/test/question-card';
import { ResultCard } from '@/components/test/result-card';

function TestContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<DiagnosticState>(createInitialState);
  const [initialized, setInitialized] = useState(false);

  // URL ?level=8 파라미터로 바로 시작, 없으면 메인으로
  useEffect(() => {
    if (initialized) return;
    const levelParam = searchParams.get('level');
    if (levelParam) {
      const level = parseFloat(levelParam);
      if (!isNaN(level)) {
        setState(startTest(createInitialState(), [level]));
      } else {
        router.push('/');
      }
    } else {
      router.push('/');
    }
    setInitialized(true);
  }, [searchParams, initialized, router]);

  const handleAnswer = useCallback((correct: boolean) => {
    setState((prev) => processAnswer(prev, correct));
  }, []);

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  const currentQuestion = getCurrentQuestion(state);

  return (
    <>
      {state.phase === 'quiz' && currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          questionNumber={state.answers.length + 1}
          totalQuestions={state.questions.length}
          onAnswer={handleAnswer}
          onBack={handleBack}
        />
      )}

      {state.phase === 'result' && (
        <ResultCard
          level={state.selectedLevels[0]}
          answers={state.answers}
          onBack={handleBack}
        />
      )}
    </>
  );
}

export default function TestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-cream">
      <Suspense>
        <TestContent />
      </Suspense>
    </main>
  );
}
