// 피그마 참조 — slate 기반 깔끔한 톤
const tintColorLight = '#0f172a'; // slate-900
const tintColorDark = '#f8fafc';  // slate-50

const Colors = {
  light: {
    text: '#0f172a',
    textSecondary: '#64748b',
    background: '#f8f9fb',
    card: '#ffffff',
    tint: tintColorLight,
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
    border: '#f1f5f9',
    accent: '#3b82f6',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    background: '#0f172a',
    card: '#1e293b',
    tint: tintColorDark,
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,
    border: '#334155',
    accent: '#60a5fa',
  },
} as const;

export default Colors;

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24,
} as const;

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 9999,
} as const;
