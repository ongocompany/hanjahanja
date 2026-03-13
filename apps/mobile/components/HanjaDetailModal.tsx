import { useState, useEffect, useRef } from 'react';
import { Modal, StyleSheet, Pressable, ScrollView, Alert, Animated, Dimensions, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface HanjaEntry {
  hanja: string;
  meaning: string;
  reading: string;
  level: number;
  freq: number;
}

export interface HanjaTapData {
  word: string;
  hanja: string;
  meaning: string;
  reading: string;
  context?: string;
  entries?: HanjaEntry[];
}

interface Props {
  visible: boolean;
  data: HanjaTapData | null;
  onClose: () => void;
  onAddVocab?: (word: string, hanja: string, meaning: string, context: string) => void;
  onSelectHanja?: (word: string, entry: HanjaEntry) => void;
  onReport?: (word: string, hanja: string, context: string) => void;
}

// 급수 숫자 → 라벨
function levelLabel(level: number): string {
  const labels: Record<number, string> = {
    8: '8급', 7.5: '준7급', 7: '7급', 6.5: '준6급', 6: '6급',
    5.5: '준5급', 5: '5급', 4.5: '준4급', 4: '4급', 3.5: '준3급',
    3: '3급', 2: '2급', 1.5: '준1급', 1: '1급', 0.5: '준특급', 0: '특급',
  };
  return labels[level] || `${level}급`;
}

export default function HanjaDetailModal({ visible, data, onClose, onAddVocab, onSelectHanja, onReport }: Props) {
  const [selectedHanja, setSelectedHanja] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible]);

  if (!data) return null;

  const currentHanja = selectedHanja || data.hanja;
  const currentEntry = data.entries?.find(e => e.hanja === currentHanja);
  const currentMeaning = currentEntry?.meaning || data.meaning;
  const currentReading = currentEntry?.reading || data.reading;

  const handleSelectEntry = (entry: HanjaEntry) => {
    setSelectedHanja(entry.hanja);
    onSelectHanja?.(data.word, entry);
  };

  const handleAddVocab = () => {
    onAddVocab?.(data.word, currentHanja, currentMeaning, data.context || '');
    Alert.alert('저장 완료', `${data.word}(${currentHanja})이(가) 단어장에 저장되었습니다.`);
    onClose();
    setSelectedHanja(null);
  };

  const handleReport = () => {
    onReport?.(data.word, currentHanja, data.context || '');
    setReported(true);
  };

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedHanja(null);
      setReported(false);
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
          {/* 핸들 바 */}
          <View style={styles.handle} />

          {/* 메인 한자 */}
          <View style={styles.header}>
            {currentHanja !== data.word ? (
              <>
                <Text style={styles.hanjaMain}>{currentHanja}</Text>
                <View style={styles.headerRight}>
                  <Text style={styles.wordMain}>{data.word}</Text>
                  <Text style={styles.readingMain}>[{currentReading}]</Text>
                </View>
              </>
            ) : (
              <View style={styles.headerRight}>
                <Text style={styles.hanjaMain}>{data.word}</Text>
                {currentReading !== data.word && (
                  <Text style={styles.readingMain}>[{currentReading}]</Text>
                )}
              </View>
            )}
          </View>

          <Text style={styles.meaningMain}>{currentMeaning}</Text>

          {/* 문맥 문장 */}
          {data.context ? (
            <View style={styles.contextBox}>
              <Ionicons name="chatbubble-outline" size={14} color="#94a3b8" />
              <Text style={styles.contextText}>{data.context}</Text>
            </View>
          ) : null}

          {/* 버튼 영역 */}
          <View style={styles.buttonRow}>
            {onAddVocab && (
              <Pressable style={[styles.addButton, { flex: 3 }]} onPress={handleAddVocab}>
                <Ionicons name="bookmark-outline" size={16} color="#fff" />
                <Text style={styles.addButtonText}>저장</Text>
              </Pressable>
            )}
            {onReport && (
              <Pressable
                style={[styles.reportButton, reported && styles.reportButtonDone, { flex: 2 }]}
                onPress={handleReport}
                disabled={reported}>
                <Ionicons
                  name={reported ? 'checkmark-circle' : 'flag-outline'}
                  size={16}
                  color={reported ? '#22c55e' : '#ef4444'}
                />
                <Text style={[styles.reportButtonText, reported && styles.reportButtonTextDone]}>
                  {reported ? '신고됨' : '오변환'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* 동음이의어 목록 */}
          {data.entries && data.entries.length > 1 && (
            <>
              <View style={styles.separator} />
              <Text style={styles.sectionTitle}>동음이의어 ({data.entries.length})</Text>
              <ScrollView style={styles.entriesList}>
                {data.entries.map((entry, idx) => {
                  const isSelected = entry.hanja === currentHanja;
                  return (
                    <Pressable
                      key={idx}
                      style={[styles.entryRow, isSelected && styles.entryRowSelected]}
                      onPress={() => handleSelectEntry(entry)}>
                      <Text style={[styles.entryHanja, isSelected && styles.entryHanjaSelected]}>
                        {entry.hanja}
                      </Text>
                      <View style={styles.entryInfo}>
                        <Text style={[styles.entryMeaning, isSelected && styles.entryMeaningSelected]} numberOfLines={2}>
                          {entry.meaning}
                        </Text>
                        <Text style={styles.entryMeta}>
                          {levelLabel(entry.level)}
                          {entry.freq > 0 ? ` · 빈도 ${entry.freq}` : ''}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '65%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerRight: {
    flex: 1,
  },
  hanjaMain: {
    fontSize: 36,
    fontWeight: '700',
    color: '#0f172a',
  },
  wordMain: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  readingMain: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  meaningMain: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 12,
  },
  contextBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  contextText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 14,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  reportButtonDone: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  reportButtonTextDone: {
    color: '#22c55e',
  },
  separator: {
    height: 1,
    width: '100%',
    marginVertical: 12,
    backgroundColor: '#eee',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  entriesList: {
    maxHeight: 200,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    gap: 12,
    minHeight: 56,
  },
  entryRowSelected: {
    backgroundColor: '#eff6ff',
  },
  entryHanja: {
    fontSize: 22,
    fontWeight: '600',
    color: '#334155',
    minWidth: 56,
  },
  entryHanjaSelected: {
    color: '#1d4ed8',
  },
  entryInfo: {
    flex: 1,
  },
  entryMeaning: {
    fontSize: 14,
    color: '#475569',
  },
  entryMeaningSelected: {
    color: '#1e40af',
  },
  entryMeta: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});
