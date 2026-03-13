/**
 * 앱 설정 (AsyncStorage 기반)
 * 급수, 변환 옵션 등
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

const KEY_USER_LEVEL = 'hj_userLevel';

// 급수 옵션 (숫자 → 라벨)
export const LEVEL_OPTIONS: { value: number; label: string }[] = [
  { value: 8, label: '8급' },
  { value: 7.5, label: '준7급' },
  { value: 7, label: '7급' },
  { value: 6.5, label: '준6급' },
  { value: 6, label: '6급' },
  { value: 5.5, label: '준5급' },
  { value: 5, label: '5급' },
  { value: 4.5, label: '준4급' },
  { value: 4, label: '4급' },
];

export function levelToLabel(level: number): string {
  return LEVEL_OPTIONS.find(o => o.value === level)?.label || `${level}급`;
}

/** 사용자 급수 저장 */
export async function setUserLevel(level: number): Promise<void> {
  await AsyncStorage.setItem(KEY_USER_LEVEL, String(level));
}

/** 사용자 급수 읽기 (기본값 8급) */
export async function getUserLevel(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_USER_LEVEL);
    return raw ? Number(raw) : 8;
  } catch {
    return 8;
  }
}

/** 급수 설정 훅 */
export function useUserLevel() {
  const [level, setLevel] = useState(8);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getUserLevel().then(lv => {
      setLevel(lv);
      setLoaded(true);
    });
  }, []);

  const updateLevel = useCallback(async (newLevel: number) => {
    setLevel(newLevel);
    await setUserLevel(newLevel);
  }, []);

  return { level, updateLevel, loaded };
}
