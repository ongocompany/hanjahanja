import { useState } from 'react';
import { StyleSheet, Pressable, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/lib/supabase/auth-provider';
import { signInWithProvider, type SocialProvider } from '@/lib/supabase/auth';
import { useUserLevel, LEVEL_OPTIONS, levelToLabel } from '@/lib/settings';

export default function MyPageScreen() {
  const { user, isLoading, signOut } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const { level, updateLevel } = useUserLevel();
  const [showLevelPicker, setShowLevelPicker] = useState(false);

  const handleLogin = async (provider: SocialProvider) => {
    try {
      setAuthLoading(true);
      await signInWithProvider(provider);
    } catch (error) {
      Alert.alert('로그인 실패', '다시 시도해주세요.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleLevelSelect = async (newLevel: number) => {
    await updateLevel(newLevel);
    setShowLevelPicker(false);
    Alert.alert(
      '급수 변경',
      `${levelToLabel(newLevel)}로 변경되었습니다.\n브라우저에서 새 페이지를 열면 적용됩니다.`,
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user ? (
        <>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <Text style={styles.nickname}>{user.user_metadata?.name || user.email || '사용자'}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>

          <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

          <View style={styles.menuSection}>
            <MenuItem label="내 급수" value={levelToLabel(level)} onPress={() => setShowLevelPicker(true)} />
            <MenuItem label="단어장" value="0개" />
            <MenuItem label="학습 기록" value="0일" />
            <MenuItem label="Anki/Quizlet 내보내기" value="" />
            <MenuItem label="설정" value="" />
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <Text style={styles.loginPrompt}>로그인하고 학습 기록을 저장하세요</Text>

            <Pressable
              style={[styles.socialButton, styles.googleButton]}
              onPress={() => handleLogin('google')}
              disabled={authLoading}>
              {authLoading ? (
                <ActivityIndicator color="#333" />
              ) : (
                <Text style={styles.googleText}>Google로 로그인</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.socialButton, styles.kakaoButton]}
              onPress={() => handleLogin('kakao')}
              disabled={authLoading}>
              <Text style={styles.kakaoText}>카카오로 로그인</Text>
            </Pressable>
          </View>

          <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

          <View style={styles.menuSection}>
            <MenuItem label="내 급수" value={levelToLabel(level)} onPress={() => setShowLevelPicker(true)} />
            <MenuItem label="설정" value="" />
          </View>
        </>
      )}

      {/* 급수 선택 모달 */}
      <Modal visible={showLevelPicker} transparent animationType="slide" onRequestClose={() => setShowLevelPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLevelPicker(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>내 급수 선택</Text>
            <Text style={styles.modalSubtitle}>
              선택한 급수 이상의 한자어만 변환됩니다{'\n'}
              (숫자가 높을수록 쉬움)
            </Text>
            <ScrollView style={styles.levelList}>
              {LEVEL_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  style={[styles.levelItem, opt.value === level && styles.levelItemSelected]}
                  onPress={() => handleLevelSelect(opt.value)}>
                  <Text style={[styles.levelLabel, opt.value === level && styles.levelLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.levelDesc}>
                    {opt.value >= 7 ? '기초' : opt.value >= 5 ? '중급' : '고급'}
                  </Text>
                  {opt.value === level && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuValue}>{value} ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
  },
  nickname: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    opacity: 0.5,
    marginBottom: 8,
  },
  loginPrompt: {
    fontSize: 15,
    opacity: 0.6,
    marginBottom: 20,
  },
  socialButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  kakaoText: {
    color: '#3C1E1E',
    fontWeight: '600',
    fontSize: 16,
  },
  separator: {
    height: 1,
    width: '100%',
    marginVertical: 8,
  },
  menuSection: {
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  menuLabel: {
    fontSize: 16,
  },
  menuValue: {
    fontSize: 15,
    opacity: 0.5,
  },
  logoutButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  logoutText: {
    color: '#e74c3c',
    fontWeight: '600',
    fontSize: 16,
  },
  // 급수 모달
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 16,
  },
  levelList: {
    maxHeight: 340,
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  levelItemSelected: {
    backgroundColor: '#eff6ff',
  },
  levelLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#334155',
    minWidth: 60,
  },
  levelLabelSelected: {
    color: '#1d4ed8',
  },
  levelDesc: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
  },
});
