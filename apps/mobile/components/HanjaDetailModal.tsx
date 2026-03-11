import { Modal, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';

export interface HanjaTapData {
  word: string;
  hanja: string;
  meaning: string;
  reading: string;
  entries?: Array<{
    hanja: string;
    meaning: string;
    reading: string;
    level: number;
    freq: number;
  }>;
}

interface Props {
  visible: boolean;
  data: HanjaTapData | null;
  onClose: () => void;
  onAddVocab?: (word: string, hanja: string) => void;
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

export default function HanjaDetailModal({ visible, data, onClose, onAddVocab }: Props) {
  if (!data) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* 핸들 바 */}
          <View style={styles.handle} />

          {/* 메인 한자 */}
          <View style={styles.header}>
            <Text style={styles.hanjaMain}>{data.hanja}</Text>
            <Text style={styles.wordMain}>{data.word}</Text>
            <Text style={styles.readingMain}>[{data.reading}]</Text>
          </View>

          <Text style={styles.meaningMain}>{data.meaning}</Text>

          {/* 단어장 추가 버튼 */}
          {onAddVocab && (
            <Pressable
              style={styles.addButton}
              onPress={() => {
                onAddVocab(data.word, data.hanja);
                onClose();
              }}>
              <Text style={styles.addButtonText}>단어장에 추가</Text>
            </Pressable>
          )}

          {/* 동음이의어 목록 */}
          {data.entries && data.entries.length > 1 && (
            <>
              <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
              <Text style={styles.sectionTitle}>동음이의어</Text>
              <ScrollView style={styles.entriesList}>
                {data.entries.map((entry, idx) => (
                  <View key={idx} style={styles.entryRow}>
                    <Text style={styles.entryHanja}>{entry.hanja}</Text>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryMeaning}>{entry.meaning}</Text>
                      <Text style={styles.entryMeta}>
                        {levelLabel(entry.level)}
                        {entry.freq > 0 ? ` · 빈도 ${entry.freq}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </Pressable>
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
    maxHeight: '60%',
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
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  hanjaMain: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2c3e50',
  },
  wordMain: {
    fontSize: 18,
    color: '#555',
  },
  readingMain: {
    fontSize: 14,
    color: '#888',
  },
  meaningMain: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#4A90D9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  separator: {
    height: 1,
    width: '100%',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  entriesList: {
    maxHeight: 200,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 12,
  },
  entryHanja: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    minWidth: 60,
  },
  entryInfo: {
    flex: 1,
  },
  entryMeaning: {
    fontSize: 14,
    color: '#555',
  },
  entryMeta: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
});
