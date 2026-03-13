import { useState } from 'react';
import { StyleSheet, ScrollView, Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DataScreen() {
  const [activeFilter, setActiveFilter] = useState('1week');

  return (
    <View style={styles.screen}>
      <Header activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SummaryCards />
        <RecentList />
      </ScrollView>
    </View>
  );
}

function Header({
  activeFilter,
  setActiveFilter,
}: {
  activeFilter: string;
  setActiveFilter: (f: string) => void;
}) {
  const filters = [
    { id: 'yesterday', label: '어제' },
    { id: '1week', label: '1주일' },
    { id: '30days', label: '30일' },
  ];

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>내 데이터</Text>
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.filterChip, activeFilter === f.id && styles.filterActive]}
            onPress={() => setActiveFilter(f.id)}
          >
            <Text style={[styles.filterText, activeFilter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SummaryCards() {
  // TODO: 실제 tracker 데이터 연동
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>총 노출</Text>
        <Text style={styles.summaryValue}>0</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>관심 보임</Text>
        <Text style={styles.summaryValue}>0</Text>
      </View>
    </View>
  );
}

function RecentList() {
  // TODO: 실제 데이터 연동
  const items = [
    { id: 1, hanja: '成長', word: '성장', meaning: '이룰 성, 길 장', date: '2026.03.13' },
    { id: 2, hanja: '目標', word: '목표', meaning: '눈 목, 표할 표', date: '2026.03.12' },
    { id: 3, hanja: '展望', word: '전망', meaning: '펼 전, 바랄 망', date: '2026.03.10' },
    { id: 4, hanja: '回復', word: '회복', meaning: '돌아올 회, 회복할 복', date: '2026.03.08' },
  ];

  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <View>
      <Text style={styles.sectionTitle}>최근 학습한 한자</Text>
      <View style={styles.listCard}>
        {items.map((item, idx) => (
          <View key={item.id}>
            <Pressable
              style={styles.listItem}
              onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              <View style={styles.listItemLeft}>
                <View style={styles.hanjaBox}>
                  <Text style={styles.hanjaBoxText}>{item.hanja}</Text>
                </View>
                <Text style={styles.listWord}>{item.word}</Text>
              </View>
              <View style={styles.chevronBox}>
                <Ionicons
                  name={expandedId === item.id ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={expandedId === item.id ? '#475569' : '#94a3b8'}
                />
              </View>
            </Pressable>

            {expandedId === item.id && (
              <View style={styles.expandedContent}>
                <View style={styles.expandedInner}>
                  <View style={styles.expandedRow}>
                    <Text style={styles.expandedLabel}>의미</Text>
                    <Text style={styles.expandedValue}>{item.meaning}</Text>
                  </View>
                  <View style={styles.expandedRow}>
                    <Text style={styles.expandedLabel}>발견한 날짜</Text>
                    <View style={styles.dateRow}>
                      <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
                      <Text style={styles.expandedDate}>{item.date}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {idx < items.length - 1 && <View style={styles.listDivider} />}
          </View>
        ))}
      </View>
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
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  filterActive: {
    backgroundColor: '#0f172a',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  hanjaBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hanjaBoxText: {
    fontSize: 18,
    color: '#0f172a',
  },
  listWord: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  chevronBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fafbfc',
  },
  expandedInner: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 14,
  },
  expandedRow: {
    gap: 4,
  },
  expandedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  expandedValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandedDate: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  listDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
});
