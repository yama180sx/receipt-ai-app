/** Core palette (Tailwind/Slate系 — メイン画面) */
const palette = {
  primary: '#2563eb',
  secondary: '#64748b',
  accent: '#f59e0b',
  background: '#f8fafc',
  surface: '#ffffff',
  error: '#ef4444',
  success: '#10b981',
  border: '#e2e8f0',
  text: {
    main: '#0f172a',
    muted: '#64748b',
    inverse: '#ffffff',
  },
} as const;

/** Semantic tokens — 画面横断で再利用する意味ベースの色 */
const semantic = {
  info: {
    bg: '#e0f2fe',
    border: '#bae6fd',
    text: '#0369a1',
  },
  neutral: {
    bg: '#f1f5f9',
    border: '#cbd5e1',
  },
  surplus: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    text: '#16a34a',
  },
  deficit: {
    bg: '#fef2f2',
    border: '#fecaca',
    text: '#dc2626',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fcd34d',
    text: '#b45309',
    inputBg: '#fef3c7',
  },
  table: {
    rowBorder: '#f0f0f0',
    headerBg: '#f8f9fa',
  },
  active: {
    bg: '#f0f7ff',
  },
  settled: {
    badgeBg: '#94a3b8',
    border: '#cbd5e1',
    bg: '#f8fafc',
  },
  admin: {
    background: '#f8f9fa',
    surface: '#ffffff',
    border: '#e9ecef',
    inputBorder: '#ced4da',
    textMuted: '#6c757d',
    textDark: '#212529',
    textLabel: '#495057',
    errorBg: '#f8d7da',
    errorBorder: '#f5c2c7',
    errorText: '#842029',
    success: '#28a745',
    danger: '#dc3545',
    arrow: '#ced4da',
    inputBg: '#f8f9fa',
  },
  scan: {
    background: '#f9fafb',
    borderLight: '#eeeeee',
    borderInput: '#f3f4f6',
    textTitle: '#333333',
    textSecondary: '#666666',
    textMuted: '#9ca3af',
    textBody: '#111827',
    textSub: '#4b5563',
    textItem: '#374151',
    primaryLight: '#eff6ff',
    pickerBg: '#fafafa',
    imageBg: '#111111',
    deleteIcon: '#d1d5db',
  },
  icon: {
    settings: '#f0f4f8',
    product: '#e3f2fd',
    prompt: '#ede7f6',
    stats: '#fff3e0',
    adminCard: '#e9ecef',
    adminSettings: '#f8f9fa',
  },
  chart: {
    barBg: '#e9ecef',
    barInactive: '#ced4da',
  },
  category: {
    newDefault: '#2ecc71',
    optimize: '#6c5ce7',
  },
  picker: {
    text: '#333333',
    muted: '#999999',
  },
  divider: '#eeeeee',
  disabled: {
    bg: '#f5f5f5',
  },
  placeholder: {
    badge: '#cccccc',
  },
} as const;

export const colors = {
  ...palette,
  semantic,
} as const;

export type ThemeColors = typeof colors;
