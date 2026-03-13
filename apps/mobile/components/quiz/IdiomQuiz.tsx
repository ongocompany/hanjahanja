import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateIdiomQuestions, IdiomQuestion } from '@/lib/quizEngine';

interface Props {
  level?: number;
  count?: number;
}

export default function IdiomQuiz({ level = 8, count = 5 }: Props) {
  const [questions, setQuestions] = useState<IdiomQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeBlankIdx, setActiveBlankIdx] = useState(0); // 현재 채울 빈칸
  const [filledChars, setFilledChars] = useState<(string | null)[]>([]);
  const [wrongShake, setWrongShake] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const qs = generateIdiomQuestions(level, count);
    setQuestions(qs);
    resetForQuestion(qs[0]);
  }, [level, count]);

  const resetForQuestion = (q?: IdiomQuestion) => {
    if (!q) return;
    setActiveBlankIdx(0);
    setFilledChars(q.blankIndices.map(() => null));
    setAllCorrect(false);
    setWrongShake(false);
  };

  const current = questions[currentIdx];

  const handleCharSelect = useCallback((char: string) => {
    if (!current || allCorrect) return;

    const correctChar = current.correctChars[activeBlankIdx];
    if (char === correctChar) {
      const newFilled = [...filledChars];
      newFilled[activeBlankIdx] = char;
      setFilledChars(newFilled);

      // 다음 빈칸으로 이동 또는 완료
      if (activeBlankIdx + 1 < current.blankIndices.length) {
        setActiveBlankIdx(activeBlankIdx + 1);
      } else {
        setAllCorrect(true);
        setScore(s => s + 1);
        // 정답이면 500ms 후 자동 다음
        setTimeout(() => {
          if (currentIdx + 1 >= questions.length) {
            setFinished(true);
          } else {
            const nextIdx = currentIdx + 1;
            setCurrentIdx(nextIdx);
            resetForQuestion(questions[nextIdx]);
          }
        }, 500);
      }
    } else {
      // 틀림 — 흔들림 효과
      setWrongShake(true);
      setTimeout(() => setWrongShake(false), 500);
    }
  }, [current, activeBlankIdx, filledChars, allCorrect]);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
    } else {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      resetForQuestion(questions[nextIdx]);
    }
  }, [currentIdx, questions]);

  const handleRestart = useCallback(() => {
    const qs = generateIdiomQuestions(level, count);
    setQuestions(qs);
    setCurrentIdx(0);
    setScore(0);
    setFinished(false);
    resetForQuestion(qs[0]);
  }, [level, count]);

  if (questions.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>사자성어 데이터를 불러오는 중...</Text>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={styles.card}>
        <View style={styles.resultBox}>
          <Text style={styles.resultEmoji}>📜</Text>
          <Text style={styles.resultTitle}>사자성어 퀴즈 완료!</Text>
          <Text style={styles.resultScore}>
            {questions.length}문제 중 <Text style={{ color: '#3b82f6' }}>{score}개</Text> 정답
          </Text>
          <Pressable style={styles.restartButton} onPress={handleRestart}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.restartText}>다시 풀기</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!current) return null;

  // 빈칸 포함 4글자 배열 생성
  const displayChars = current.hanja.split('').map((ch, idx) => {
    const blankPosition = current.blankIndices.indexOf(idx);
    if (blankPosition >= 0) {
      return filledChars[blankPosition] || null;
    }
    return ch;
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>사자성어</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{currentIdx + 1}/{questions.length}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIdx + 1) / questions.length) * 100}%` }]} />
      </View>

      {/* 뜻 힌트 */}
      <View style={styles.hintBox}>
        <Text style={styles.hintText}>빈칸에 알맞은 한자를 채워 넣으세요</Text>
        <Text style={styles.hintMeaning}>"{current.meaning}"</Text>
      </View>

      {/* 4글자 박스 */}
      <View style={[styles.idiomRow, wrongShake && { transform: [{ translateX: 4 }] }]}>
        {displayChars.map((ch, idx) => {
          const isBlank = current.blankIndices.includes(idx);
          const blankPos = current.blankIndices.indexOf(idx);
          const isActiveBlank = isBlank && blankPos === activeBlankIdx && !allCorrect;

          return (
            <View
              key={idx}
              style={[
                styles.idiomBox,
                ch ? styles.idiomFilled : styles.idiomEmpty,
                isActiveBlank && styles.idiomActive,
                allCorrect && styles.idiomCorrectAll,
              ]}
            >
              <Text style={[
                styles.idiomChar,
                !ch && { color: '#cbd5e1' },
                allCorrect && { color: '#059669' },
              ]}>
                {ch || '?'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 한자 읽기 */}
      <View style={styles.readingRow}>
        {current.chars.map((c, idx) => (
          <Text key={idx} style={styles.readingText}>{c.reading}</Text>
        ))}
      </View>

      {/* 보기 (빈칸이 남아있을 때만) */}
      {!allCorrect && activeBlankIdx < current.blankIndices.length && (
        <View style={styles.charOptions}>
          {current.charOptions[activeBlankIdx].map((ch, idx) => (
            <Pressable
              key={idx}
              style={styles.charOption}
              onPress={() => handleCharSelect(ch)}
            >
              <Text style={styles.charOptionText}>{ch}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* 정답 후 다음 버튼 */}
      {allCorrect && (
        <View style={styles.feedback}>
          <View style={styles.feedbackRow}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.feedbackText}>정답!</Text>
          </View>
          <Text style={styles.feedbackWord}>
            {current.word} ({current.hanja})
          </Text>
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
  badge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#eff6ff', borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
  progressBar: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 },
  hintBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  hintText: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  hintMeaning: { fontSize: 15, fontWeight: '600', color: '#0f172a', lineHeight: 22 },
  idiomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  idiomBox: {
    width: 56,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  idiomFilled: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  idiomEmpty: { backgroundColor: '#fff', borderColor: '#cbd5e1', borderStyle: 'dashed' },
  idiomActive: { borderColor: '#3b82f6', borderStyle: 'solid', backgroundColor: '#eff6ff' },
  idiomCorrectAll: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  idiomChar: { fontSize: 28, fontWeight: '500', color: '#0f172a' },
  readingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  readingText: { width: 56, textAlign: 'center', fontSize: 12, color: '#94a3b8' },
  charOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  charOption: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  charOptionText: { fontSize: 24, color: '#0f172a' },
  feedback: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  feedbackText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  feedbackWord: { fontSize: 13, color: '#64748b', marginBottom: 12 },
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
  resultScore: { fontSize: 16, color: '#475569', marginBottom: 20 },
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
