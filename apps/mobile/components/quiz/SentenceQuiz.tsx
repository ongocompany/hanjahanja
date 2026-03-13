import { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * 문장 퀴즈 — 문맥 속 한자어 찾기
 *
 * 실제 데이터: user_vocabulary.context_sentence에서 가져옴
 * 지금은 샘플 데이터로 UI 구현
 */

interface SentenceQuestion {
  sentence: string;       // 원문 (한자어 부분이 ___로 대체)
  blankWord: string;      // 빈칸에 들어갈 한글 단어
  blankHanja: string;     // 정답 한자
  options: string[];      // 4개 한자 보기
  correctIndex: number;
  fullSentence: string;   // 완전한 원문
}

const SAMPLE_QUESTIONS: SentenceQuestion[] = [
  {
    sentence: '이번 대회에서 좋은 ___을 거둬서 기분이 좋다.',
    blankWord: '성과',
    blankHanja: '成果',
    options: ['成果', '聖果', '城果', '誠果'],
    correctIndex: 0,
    fullSentence: '이번 대회에서 좋은 成果(성과)를 거둬서 기분이 좋다.',
  },
  {
    sentence: '급한 안건이 있어 오후에 ___가 열린다.',
    blankWord: '회의',
    blankHanja: '會議',
    options: ['回義', '會議', '懷疑', '灰衣'],
    correctIndex: 1,
    fullSentence: '급한 안건이 있어 오후에 會議(회의)가 열린다.',
  },
  {
    sentence: '꾸준한 ___이 건강의 비결이라고 의사가 말했다.',
    blankWord: '운동',
    blankHanja: '運動',
    options: ['雲動', '運動', '韻動', '云同'],
    correctIndex: 1,
    fullSentence: '꾸준한 運動(운동)이 건강의 비결이라고 의사가 말했다.',
  },
  {
    sentence: '그 학자는 자기 ___에서 뛰어난 업적을 남겼다.',
    blankWord: '분야',
    blankHanja: '分野',
    options: ['分野', '粉夜', '奮也', '紛野'],
    correctIndex: 0,
    fullSentence: '그 학자는 자기 分野(분야)에서 뛰어난 업적을 남겼다.',
  },
  {
    sentence: '새로운 기술의 발전이 우리 ___을 바꾸고 있다.',
    blankWord: '생활',
    blankHanja: '生活',
    options: ['生活', '生滑', '省活', '聲活'],
    correctIndex: 0,
    fullSentence: '새로운 기술의 발전이 우리 生活(생활)을 바꾸고 있다.',
  },
];

export default function SentenceQuiz() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = SAMPLE_QUESTIONS;
  const current = questions[currentIdx];

  const handleSelect = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    if (idx === current.correctIndex) {
      setScore(s => s + 1);
      setTimeout(() => {
        if (currentIdx + 1 >= questions.length) {
          setFinished(true);
        } else {
          setCurrentIdx(i => i + 1);
          setSelectedAnswer(null);
        }
      }, 500);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <View style={styles.card}>
        <View style={styles.resultBox}>
          <Text style={styles.resultEmoji}>📝</Text>
          <Text style={styles.resultTitle}>문장 퀴즈 완료!</Text>
          <Text style={styles.resultScore}>
            {questions.length}문제 중 <Text style={{ color: '#3b82f6' }}>{score}개</Text> 정답
          </Text>
          <Text style={styles.resultHint}>
            더 많은 문장 퀴즈는 브라우저에서{'\n'}한자를 클릭하면 자동으로 쌓여요!
          </Text>
          <Pressable style={styles.restartButton} onPress={handleRestart}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.restartText}>다시 풀기</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 문장에서 ___ 부분을 강조
  const sentenceParts = current.sentence.split('___');

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>문장 퀴즈</Text>
          <Text style={styles.cardSubtitle}>문맥에 알맞은 한자어를 고르세요</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{currentIdx + 1}/{questions.length}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIdx + 1) / questions.length) * 100}%` }]} />
      </View>

      {/* 문장 카드 */}
      <View style={styles.sentenceBox}>
        <Text style={styles.sentenceText}>
          {sentenceParts[0]}
          <Text style={styles.blankText}>
            {selectedAnswer !== null ? current.blankHanja : ` ${current.blankWord} `}
          </Text>
          {sentenceParts[1]}
        </Text>
      </View>

      {/* 보기 */}
      <View style={styles.options}>
        {current.options.map((option, idx) => {
          const isCorrect = idx === current.correctIndex;
          const isSelected = idx === selectedAnswer;
          const answered = selectedAnswer !== null;

          return (
            <Pressable
              key={idx}
              style={[
                styles.option,
                answered && isCorrect && styles.optionCorrect,
                answered && isSelected && !isCorrect && styles.optionWrong,
                answered && !isCorrect && !isSelected && { opacity: 0.4 },
              ]}
              onPress={() => handleSelect(idx)}
              disabled={answered}
            >
              <Text style={[
                styles.optionText,
                answered && isCorrect && { color: '#059669' },
                answered && isSelected && !isCorrect && { color: '#e11d48' },
              ]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 피드백 */}
      {selectedAnswer !== null && (
        <View style={styles.feedback}>
          <View style={styles.feedbackRow}>
            <Ionicons
              name={selectedAnswer === current.correctIndex ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={selectedAnswer === current.correctIndex ? '#059669' : '#e11d48'}
            />
            <Text style={styles.feedbackText}>
              {selectedAnswer === current.correctIndex ? '정답!' : `오답 — 정답: ${current.blankHanja}`}
            </Text>
          </View>
          <Text style={styles.feedbackSentence}>{current.fullSentence}</Text>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  cardSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#eff6ff', borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
  progressBar: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 },
  sentenceBox: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sentenceText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#e2e8f0',
    lineHeight: 28,
  },
  blankText: {
    color: '#60a5fa',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
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
  optionText: { fontSize: 18, fontWeight: '500', color: '#334155', textAlign: 'center' },
  feedback: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  feedbackText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  feedbackSentence: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 12 },
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
  resultScore: { fontSize: 16, color: '#475569', marginBottom: 8 },
  resultHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
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
