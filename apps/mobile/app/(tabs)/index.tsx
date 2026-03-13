import { StyleSheet, ScrollView, Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import WordQuiz from '@/components/quiz/WordQuiz';
import SentenceQuiz from '@/components/quiz/SentenceQuiz';
import WritingQuiz from '@/components/quiz/WritingQuiz';
import IdiomQuiz from '@/components/quiz/IdiomQuiz';
import RadicalTree from '@/components/quiz/RadicalTree';

export default function LearnScreen() {
  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WordQuiz level={8} count={10} />
        <SentenceQuiz />
        <WritingQuiz level={8} count={5} />
        <IdiomQuiz level={8} count={5} />
        <RadicalTree level={8} />
      </ScrollView>
    </View>
  );
}

function Header() {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>오늘의 학습</Text>
        <Pressable
          style={styles.profileButton}
          onPress={() => router.push('/mypage')}
        >
          <Ionicons name="person-circle-outline" size={28} color="#64748b" />
        </Pressable>
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
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
});
