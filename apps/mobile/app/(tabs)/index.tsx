import { StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';

import { Text, View } from '@/components/Themed';

export default function LearnScreen() {
  return (
    <ScrollView style={styles.scroll}>
      <View style={styles.container}>
        <Text style={styles.title}>한자한자 학습</Text>
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

        {/* 오늘의 학습 요약 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>오늘의 학습</Text>
          <Text style={styles.cardText}>노출 한자: 0개</Text>
          <Text style={styles.cardText}>클릭 한자: 0개</Text>
          <Text style={styles.cardText}>퀴즈 정답률: -</Text>
        </View>

        {/* 빠른 메뉴 */}
        <View style={styles.menuGrid}>
          <View style={styles.menuItem}>
            <Text style={styles.menuEmoji}>📖</Text>
            <Text style={styles.menuLabel}>단어장</Text>
          </View>
          <View style={styles.menuItem}>
            <Text style={styles.menuEmoji}>❓</Text>
            <Text style={styles.menuLabel}>맞춤 퀴즈</Text>
          </View>
          <View style={styles.menuItem}>
            <Text style={styles.menuEmoji}>📝</Text>
            <Text style={styles.menuLabel}>진단 테스트</Text>
          </View>
          <View style={styles.menuItem}>
            <Text style={styles.menuEmoji}>📊</Text>
            <Text style={styles.menuLabel}>학습 통계</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 16,
    height: 1,
    width: '100%',
  },
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    marginBottom: 4,
    opacity: 0.7,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  menuEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
