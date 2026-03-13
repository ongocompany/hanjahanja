import { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Pressable, View, Text, Animated, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { generateWritingQuestions, WritingQuestion } from '@/lib/quizEngine';

const CANVAS_SIZE = Dimensions.get('window').width - 80;

interface Props {
  level?: number;
  count?: number;
}

export default function WritingQuiz({ level = 8, count = 5 }: Props) {
  const [questions, setQuestions] = useState<WritingQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [strokesCompleted, setStrokesCompleted] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    const qs = generateWritingQuestions(level, count);
    setQuestions(qs);
    setCurrentIdx(0);
    setScore(0);
    setFinished(false);
  }, [level, count]);

  const current = questions[currentIdx];

  // WebView에서 오는 메시지 처리
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'onCorrectStroke':
          setStrokesCompleted(data.strokesCompleted);
          setTotalStrokes(data.totalStrokes);
          break;
        case 'onMistake':
          setMistakes(m => m + 1);
          // 흔들림 애니메이션
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
          ]).start();
          break;
        case 'onComplete':
          setIsComplete(true);
          setStrokesCompleted(data.totalStrokes);
          setTotalStrokes(data.totalStrokes);
          if (data.mistakes === 0) {
            setScore(s => s + 1);
          }
          // 500ms 후 자동 다음
          setTimeout(() => {
            if (currentIdx + 1 >= questions.length) {
              setFinished(true);
            } else {
              setCurrentIdx(i => i + 1);
              setMistakes(0);
              setStrokesCompleted(0);
              setTotalStrokes(0);
              setIsComplete(false);
            }
          }, 500);
          break;
      }
    } catch {}
  }, [shakeAnim]);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
    } else {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setMistakes(0);
      setStrokesCompleted(0);
      setTotalStrokes(0);
      setIsComplete(false);
    }
  }, [currentIdx, questions.length]);

  const handleRetry = useCallback(() => {
    // 같은 문제 다시
    setMistakes(0);
    setStrokesCompleted(0);
    setIsComplete(false);
    webViewRef.current?.injectJavaScript('startQuiz(); true;');
  }, []);

  const handleRestart = useCallback(() => {
    const qs = generateWritingQuestions(level, count);
    setQuestions(qs);
    setCurrentIdx(0);
    setScore(0);
    setFinished(false);
    setMistakes(0);
    setStrokesCompleted(0);
    setTotalStrokes(0);
    setIsComplete(false);
  }, [level, count]);

  if (questions.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>쓰기 데이터를 불러오는 중...</Text>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={styles.card}>
        <View style={styles.resultBox}>
          <Text style={styles.resultEmoji}>✍️</Text>
          <Text style={styles.resultTitle}>쓰기 연습 완료!</Text>
          <Text style={styles.resultScore}>
            {questions.length}글자 중{' '}
            <Text style={{ color: '#3b82f6' }}>{score}개</Text> 완벽
          </Text>
          <Pressable style={styles.restartButton} onPress={handleRestart}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.restartText}>다시 연습</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!current) return null;

  const html = buildHanziWriterHTML(current.char, CANVAS_SIZE);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>한자 쓰기</Text>
          <Text style={styles.cardSubtitle}>
            <Text style={styles.hintBold}>{current.hint}</Text>에 해당하는 한자를 쓰세요
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{currentIdx + 1}/{questions.length}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIdx + 1) / questions.length) * 100}%` }]} />
      </View>

      {/* HanziWriter 캔버스 */}
      <Animated.View style={[styles.canvasWrapper, { transform: [{ translateX: shakeAnim }] }]}>
        <View style={[styles.canvasBorder, isComplete && styles.canvasBorderComplete]}>
          <WebView
            ref={webViewRef}
            key={`${current.char}-${currentIdx}`}
            source={{ html }}
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, backgroundColor: 'transparent' }}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            javaScriptEnabled
            onMessage={handleMessage}
          />
        </View>
      </Animated.View>

      {/* 상태 표시 */}
      <View style={styles.statusRow}>
        {totalStrokes > 0 && (
          <Text style={styles.strokeCount}>
            획수 {strokesCompleted}/{totalStrokes}
          </Text>
        )}
        {mistakes > 0 && (
          <Text style={styles.mistakeCount}>오답 {mistakes}회</Text>
        )}
      </View>

      {/* 완료 후 */}
      {isComplete && (
        <View style={styles.feedback}>
          <View style={styles.feedbackRow}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.feedbackText}>
              {mistakes === 0 ? '완벽!' : `완성! (오답 ${mistakes}회)`}
            </Text>
          </View>
          <Text style={styles.feedbackChar}>
            {current.char} — {current.hint}
          </Text>
          <View style={styles.feedbackActions}>
            <Pressable style={styles.retryBtn} onPress={handleRetry}>
              <Ionicons name="refresh" size={16} color="#64748b" />
              <Text style={styles.retryText}>다시 쓰기</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {currentIdx + 1 >= questions.length ? '결과 보기' : '다음 글자'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function buildHanziWriterHTML(char: string, size: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    overflow: hidden;
    touch-action: none;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${size}px;
    height: ${size}px;
  }
  #writer { position: relative; }
  /* 가이드 격자선 */
  #writer::before, #writer::after {
    content: '';
    position: absolute;
    border: 1px dashed #e2e8f0;
    pointer-events: none;
    z-index: 1;
  }
  #writer::before {
    top: 0; bottom: 0;
    left: 50%;
    width: 0;
  }
  #writer::after {
    left: 0; right: 0;
    top: 50%;
    height: 0;
  }
</style>
</head>
<body>
<div id="writer"></div>
<script>
  var writer = HanziWriter.create('writer', '${char}', {
    width: ${size - 20},
    height: ${size - 20},
    padding: 15,
    showOutline: false,
    showCharacter: false,
    strokeColor: '#0f172a',
    drawingColor: '#0f172a',
    drawingWidth: 6,
    highlightColor: '#93c5fd',
    highlightOnComplete: true,
    highlightCompleteColor: '#059669',
    outlineColor: '#e2e8f0',
    showHintAfterMisses: 2,
    strokeAnimationSpeed: 2,
    delayBetweenStrokes: 100,
  });

  function startQuiz() {
    writer.quiz({
      leniency: 2.0,
      acceptBackwardsStrokes: true,
      onCorrectStroke: function(data) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'onCorrectStroke',
          strokesCompleted: data.strokeNum + 1,
          totalStrokes: data.strokesTotal,
        }));
      },
      onMistake: function(data) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'onMistake',
          strokeNum: data.strokeNum,
          mistakes: data.mistakesOnStroke,
        }));
      },
      onComplete: function(data) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'onComplete',
          totalStrokes: data.totalMistakes + data.character.length,
          mistakes: data.totalMistakes,
        }));
      },
    });
  }

  startQuiz();
</script>
</body>
</html>`;
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  cardSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4, lineHeight: 20 },
  hintBold: { fontWeight: '700', color: '#0f172a', fontSize: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#eff6ff', borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
  progressBar: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 },
  canvasWrapper: { alignItems: 'center', marginBottom: 12 },
  canvasBorder: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  canvasBorderComplete: {
    borderColor: '#a7f3d0',
    borderStyle: 'solid',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  strokeCount: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  mistakeCount: { fontSize: 13, fontWeight: '600', color: '#e11d48' },
  feedback: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  feedbackText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  feedbackChar: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  feedbackActions: { flexDirection: 'row', gap: 10 },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  retryText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  nextButton: {
    flex: 2,
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
