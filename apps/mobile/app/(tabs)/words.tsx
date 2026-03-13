import { useState, useRef } from 'react';
import { StyleSheet, Pressable, View, Text, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CARD_WIDTH = Dimensions.get('window').width - 80;
const CARD_HEIGHT = CARD_WIDTH * 1.33;

export default function WordsScreen() {
  const [viewMode, setViewMode] = useState<'words' | 'sentences'>('words');

  return (
    <View style={styles.screen}>
      <Header viewMode={viewMode} setViewMode={setViewMode} />
      <View style={styles.content}>
        <FlashCard />
        <ActionButtons />
      </View>
    </View>
  );
}

function Header({
  viewMode,
  setViewMode,
}: {
  viewMode: string;
  setViewMode: (v: 'words' | 'sentences') => void;
}) {
  return (
    <View style={styles.header}>
      <View style={{ width: 32 }} />
      <View style={styles.segmentedControl}>
        <Pressable
          style={[styles.segment, viewMode === 'words' && styles.segmentActive]}
          onPress={() => setViewMode('words')}
        >
          <Text style={[styles.segmentText, viewMode === 'words' && styles.segmentTextActive]}>
            단어
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, viewMode === 'sentences' && styles.segmentActive]}
          onPress={() => setViewMode('sentences')}
        >
          <Text style={[styles.segmentText, viewMode === 'sentences' && styles.segmentTextActive]}>
            문장
          </Text>
        </Pressable>
      </View>
      <Pressable style={styles.shareButton}>
        <Ionicons name="share-outline" size={18} color="#94a3b8" />
      </Pressable>
    </View>
  );
}

function FlashCard() {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // TODO: 실제 단어장 데이터 연동
  const card = {
    hanja: '成長',
    word: '성장',
    meaning: '이룰 성, 길 장',
  };

  const handleFlip = () => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <Pressable onPress={handleFlip} style={styles.cardContainer}>
      {/* 앞면: 한자 */}
      <Animated.View
        style={[
          styles.flashCard,
          styles.flashCardFront,
          { transform: [{ perspective: 1200 }, { rotateY: frontRotate }] },
        ]}
      >
        <Text style={styles.flashHanja}>{card.hanja}</Text>
        <View style={styles.flashHint}>
          <Text style={styles.flashHintText}>터치해서 정답 확인</Text>
        </View>
      </Animated.View>

      {/* 뒷면: 뜻 */}
      <Animated.View
        style={[
          styles.flashCard,
          styles.flashCardBack,
          { transform: [{ perspective: 1200 }, { rotateY: backRotate }] },
        ]}
      >
        <Text style={styles.flashWord}>{card.word}</Text>
        <Text style={styles.flashMeaning}>{card.meaning}</Text>
        <View style={[styles.flashHint, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.flashHintText, { color: '#94a3b8' }]}>터치해서 다시 뒤집기</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function ActionButtons() {
  return (
    <View style={styles.actions}>
      <Pressable style={[styles.actionButton, styles.retryButton]}>
        <Ionicons name="refresh-outline" size={20} color="#e11d48" />
        <Text style={styles.retryText}>다시 복습</Text>
      </Pressable>
      <Pressable style={[styles.actionButton, styles.knownButton]}>
        <Ionicons name="checkmark" size={22} color="#059669" />
        <Text style={styles.knownText}>기억함</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    width: 160,
  },
  segment: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#0f172a',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#fff',
  },
  shareButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginBottom: 30,
  },
  flashCard: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backfaceVisibility: 'hidden',
  },
  flashCardFront: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  flashCardBack: {
    backgroundColor: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 4,
  },
  flashHanja: {
    fontSize: 80,
    color: '#0f172a',
    letterSpacing: -2,
  },
  flashWord: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  flashMeaning: {
    fontSize: 17,
    fontWeight: '500',
    color: '#94a3b8',
  },
  flashHint: {
    position: 'absolute',
    bottom: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
  },
  flashHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#fff1f2',
  },
  knownButton: {
    backgroundColor: '#ecfdf5',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e11d48',
  },
  knownText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
});
