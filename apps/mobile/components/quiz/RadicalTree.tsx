import { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Pressable, View, Text, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateRadicalChain, getCharsByRadical, RadicalChainNode } from '@/lib/quizEngine';

interface Props {
  level?: number;
}

export default function RadicalTree({ level = 8 }: Props) {
  const [chain, setChain] = useState<RadicalChainNode[]>([]);
  const [visibleCount, setVisibleCount] = useState(1);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [splitView, setSplitView] = useState<{ char: string; radical: string; phonetic: string } | null>(null);
  const fadeAnims = useRef<Animated.Value[]>([]);

  useEffect(() => {
    const newChain = generateRadicalChain(level, 6);
    setChain(newChain);
    setVisibleCount(1);
    setSelectedIdx(null);
    setSplitView(null);
    fadeAnims.current = newChain.map(() => new Animated.Value(0));
    // 첫 번째 노드 페이드인
    if (fadeAnims.current[0]) {
      Animated.timing(fadeAnims.current[0], {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [level]);

  const handleCharTap = useCallback((idx: number) => {
    if (idx !== visibleCount - 1) return; // 마지막 노드만 탭 가능

    const node = chain[idx];
    if (!node) return;

    // 분해 뷰 보여주기
    setSplitView({
      char: node.char,
      radical: node.radical,
      phonetic: node.char, // 성부(소리 부분) - 간단히 표현
    });
    setSelectedIdx(idx);
  }, [chain, visibleCount]);

  const handleRadicalSelect = useCallback(() => {
    // 다음 노드로 진행
    if (visibleCount < chain.length) {
      const nextIdx = visibleCount;
      setVisibleCount(v => v + 1);
      setSplitView(null);
      setSelectedIdx(null);

      // 다음 노드 페이드인
      if (fadeAnims.current[nextIdx]) {
        Animated.timing(fadeAnims.current[nextIdx], {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [visibleCount, chain.length]);

  const handleRefresh = useCallback(() => {
    const newChain = generateRadicalChain(level, 6);
    setChain(newChain);
    setVisibleCount(1);
    setSelectedIdx(null);
    setSplitView(null);
    fadeAnims.current = newChain.map(() => new Animated.Value(0));
    if (fadeAnims.current[0]) {
      Animated.timing(fadeAnims.current[0], {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [level]);

  if (chain.length === 0) {
    return (
      <View style={styles.darkCard}>
        <Text style={styles.emptyText}>데이터를 불러오는 중...</Text>
      </View>
    );
  }

  const isComplete = visibleCount >= chain.length && !splitView;

  return (
    <View style={styles.darkCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>한자 꼬리물기</Text>
          <Text style={styles.cardSubtitle}>한자를 눌러 부수를 탐험하세요</Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={handleRefresh}>
          <Ionicons name="shuffle" size={18} color="#94a3b8" />
        </Pressable>
      </View>

      {/* 체인 시각화 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chainRow}
      >
        {chain.slice(0, visibleCount).map((node, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.chainItem,
              { opacity: fadeAnims.current[idx] || 1 },
            ]}
          >
            {idx > 0 && (
              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <Pressable
              style={[
                styles.chainCharBox,
                selectedIdx === idx && styles.chainCharBoxActive,
                idx === visibleCount - 1 && !splitView && styles.chainCharBoxTappable,
              ]}
              onPress={() => handleCharTap(idx)}
            >
              <Text style={styles.chainChar}>{node.char}</Text>
            </Pressable>
            <Text style={styles.chainReading}>{node.meaning} {node.reading}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      {/* 분해 뷰 */}
      {splitView && (
        <View style={styles.splitContainer}>
          <View style={styles.splitLine} />
          <Text style={styles.splitLabel}>구성 요소</Text>
          <View style={styles.splitRow}>
            {/* 부수 */}
            <Pressable
              style={[styles.splitBox, styles.splitBoxActive]}
              onPress={handleRadicalSelect}
            >
              <Text style={styles.splitChar}>{splitView.radical}</Text>
              <Text style={styles.splitType}>부수</Text>
              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>탭!</Text>
              </View>
            </Pressable>

            <View style={styles.splitPlus}>
              <Text style={styles.splitPlusText}>+</Text>
            </View>

            {/* 소리 부분 */}
            <View style={styles.splitBox}>
              <Text style={styles.splitChar}>{splitView.phonetic}</Text>
              <Text style={styles.splitType}>글자</Text>
            </View>
          </View>
        </View>
      )}

      {/* 부수 설명 */}
      {chain.length > 0 && (
        <View style={styles.explainBox}>
          <Text style={styles.explainText}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>
              {chain[0].radical} ({chain[0].meaning.split('/')[0]})
            </Text>
            {' '}부수를 따라가며 한자의 관계를 탐험합니다.
          </Text>
        </View>
      )}

      {/* 완료 */}
      {isComplete && (
        <Pressable style={styles.completeBtn} onPress={handleRefresh}>
          <Ionicons name="shuffle" size={16} color="#fff" />
          <Text style={styles.completeText}>새로운 꼬리물기</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  darkCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
  },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', padding: 20 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cardSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  chainItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  arrowContainer: {
    marginHorizontal: 6,
  },
  chainCharBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainCharBoxActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  chainCharBoxTappable: {
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
  },
  chainChar: { fontSize: 26, color: '#fff' },
  chainReading: {
    position: 'absolute',
    bottom: -18,
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    width: 52,
  },
  splitContainer: {
    marginTop: 28,
    alignItems: 'center',
  },
  splitLine: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 8,
  },
  splitLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  splitBox: {
    width: 64,
    height: 72,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitBoxActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  splitChar: { fontSize: 24, color: '#fff', marginBottom: 2 },
  splitType: { fontSize: 10, color: '#64748b' },
  tapHint: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tapHintText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  splitPlus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitPlusText: { fontSize: 14, color: '#64748b' },
  explainBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  explainText: { fontSize: 13, color: '#94a3b8', lineHeight: 20 },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  completeText: { fontSize: 14, fontWeight: '600', color: '#60a5fa' },
});
