/** 어문회 급수 정의 */
export const HANJA_LEVELS = [
  { value: 8, label: "8급", charCount: 50 },
  { value: 7.5, label: "준7급", charCount: 100 },
  { value: 7, label: "7급", charCount: 150 },
  { value: 6.5, label: "준6급", charCount: 188 },
  { value: 6, label: "6급", charCount: 225 },
  { value: 5.5, label: "준5급", charCount: 275 },
  { value: 5, label: "5급", charCount: 325 },
  { value: 4.5, label: "준4급", charCount: 400 },
  { value: 4, label: "4급", charCount: 500 },
  // --- 여기부터 프리미엄 ---
  { value: 3.5, label: "준3급", charCount: 750 },
  { value: 3, label: "3급", charCount: 1000 },
  { value: 2.5, label: "준2급", charCount: 1250 },
  { value: 2, label: "2급", charCount: 1500 },
  { value: 1.5, label: "준1급", charCount: 1750 },
  { value: 1, label: "1급", charCount: 2000 },
  { value: 0.5, label: "준특급", charCount: 2750 },
  { value: 0, label: "특급", charCount: 3500 },
] as const;

/** MVP 무료 범위 최소 급수 (4급까지) */
export const FREE_TIER_MIN_LEVEL = 4;

/** 기본 레벨 (8급 = 가장 쉬움) */
export const DEFAULT_LEVEL = 8;

/** 급수 숫자 → 라벨 변환 */
export function getLevelLabel(level: number): string {
  const found = HANJA_LEVELS.find((l) => l.value === level);
  return found?.label ?? `${level}급`;
}

/** 진단 테스트 통과 기준 정답률 */
export const DIAGNOSTIC_PASS_RATE = 0.6;

/** 진단 테스트 급수당 문제 수 */
export const QUESTIONS_PER_LEVEL = 5;
