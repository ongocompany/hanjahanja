import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Pressable, View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateWordQuestions, WordQuestion } from '@/lib/quizEngine';

interface Props {
  level?: number;
  count?: number;
}

export default function WordQuiz({ level = 8, count = 10 }: Props) {
  const [questions, setQuestions] = useState<WordQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setQuestions(generateWordQuestions(level, count));
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setFinished(false);
  }, [level, count]);

  const current = questions[currentIdx];

  const handleSelect = useCallback((idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    if (current && idx === current.correctIndex) {
      setScore(s => s + 1);
      // 정답이면 500ms 후 자동 다음
      setTimeout(() => {
        if (currentIdx + 1 >= questions.length) {
          setFinished(true);
        } else {
          setCurrentIdx(i => i + 1);
          setSelectedAnswer(null);
        }
      }, 500);
    }
  }, [selectedAnswer, current, currentIdx, questions.length]);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
    }
  }, [currentIdx, questions.length]);

  const handleRestart = useCallback(() => {
    setQuestions(generateWordQuestions(level, count));
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setFinished(false);
  }, [level, count]);

  if (questions.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>퀴즈 데이터를 불러오는 중...</Text>
      </View>
    );
  }

  // 완료 화면
  if (finished) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.card}>
        <View style={styles.resultBox}>
          <Text style={styles.resultEmoji}>
            {percent >= 80 ? '🎉' : percent >= 50 ? '💪' : '📖'}
          </Text>
          <Text style={styles.resultTitle}>퀴즈 완료!</Text>
          <Text style={styles.resultScore}>
            {questions.length}문제 중 <Text style={{ color: '#3b82f6' }}>{score}개</Text> 정답
          </Text>
          <Text style={styles.resultPercent}>{percent}%</Text>
          <Pressable style={styles.restartButton} onPress={handleRestart}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.restartText}>다시 풀기</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!current) return null;

  return (
    <View style={styles.card}>
      {/* 진행률 */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>단어 퀴즈</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{currentIdx + 1}/{questions.length}</Text>
        </View>
      </View>

      {/* 진행 바 */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIdx + 1) / questions.length) * 100}%` }]} />
      </View>

      {/* 뜻풀이 힌트 */}
      <View style={styles.hintBox}>
        <Text style={styles.hintLabel}>다음 뜻에 해당하는 한자어를 고르세요</Text>
        <Text style={styles.hintMeaning}>"{current.meaning}"</Text>
      </View>

      {/* 보기 */}
      <View style={styles.options}>
        {current.options.map((option, idx) => {
          const isCorrect = idx === current.correctIndex;
          const isSelected = idx === selectedAnswer;
          const answered = selectedAnswer !== null;

          let btnStyle = styles.option;
          let txtStyle = styles.optionText;
          if (answered) {
            if (isCorrect) {
              btnStyle = { ...styles.option, ...styles.optionCorrect };
              txtStyle = { ...styles.optionText, color: '#059669' };
            } else if (isSelected) {
              btnStyle = { ...styles.option, ...styles.optionWrong };
              txtStyle = { ...styles.optionText, color: '#e11d48' };
            } else {
              btnStyle = { ...styles.option, ...styles.optionDimmed };
            }
          }

          return (
            <Pressable
              key={idx}
              style={btnStyle}
              onPress={() => handleSelect(idx)}
              disabled={answered}
            >
              <Text style={txtStyle}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 정답 피드백 + 다음 버튼 */}
      {selectedAnswer !== null && (
        <View style={styles.feedback}>
          <View style={styles.feedbackRow}>
            <Ionicons
              name={selectedAnswer === current.correctIndex ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={selectedAnswer === current.correctIndex ? '#059669' : '#e11d48'}
            />
            <Text style={styles.feedbackText}>
              {selectedAnswer === current.correctIndex
                ? '정답!'
                : `오답 — 정답: ${current.hanja}`}
            </Text>
          </View>
          <Text style={styles.feedbackWord}>
            {current.word} ({current.hanja})
          </Text>
          {current.chars.length > 0 && (
            <Text style={styles.feedbackChars}>
              {current.chars.map(c => `${c.char}(${c.meaning} ${c.reading})`).join(' ')}
            </Text>
          )}
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIdx + 1 >= questions.length ? '결과 보기' : '다음 문제'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: 20 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
  progressBar: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  hintBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  hintLabel: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  hintMeaning: { fontSize: 16, fontWeight: '600', color: '#0f172a', lineHeight: 24 },
  options: { gap: 10 },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  optionCorrect: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  optionWrong: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  optionDimmed: { opacity: 0.4 },
  optionText: { fontSize: 18, fontWeight: '500', color: '#334155', textAlign: 'center' },
  feedback: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  feedbackText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  feedbackWord: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  feedbackChars: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 14,
  },
  nextButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  resultBox: { alignItems: 'center', paddingVertical: 20 },
  resultEmoji: { fontSize: 48, marginBottom: 12 },
  resultTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  resultScore: { fontSize: 16, color: '#475569', marginBottom: 4 },
  resultPercent: { fontSize: 40, fontWeight: '700', color: '#3b82f6', marginBottom: 20 },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  restartText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
