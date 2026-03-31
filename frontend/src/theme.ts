export const theme = {
  colors: {
    primary: '#2563eb',     // メインカラー：信頼感のあるブルー
    secondary: '#64748b',   // 補助テキスト：落ち着いたグレー
    accent: '#f59e0b',      // アクセント：注意や未分類
    background: '#f8fafc',  // 全体背景：清潔感のあるオフホワイト
    surface: '#ffffff',     // カード/パネル：純白
    error: '#ef4444',       // エラー/削除/支出増
    success: '#10b981',     // 追加：成功/支出減 (Emerald-500相当)
    border: '#e2e8f0',      // 境界線
    text: {
      main: '#0f172a',      // 本文
      muted: '#64748b',     // 補足
      inverse: '#ffffff',   // 反転（ボタン文字など）
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 12,   // 少し丸みを強めるのがモダンな傾向
    lg: 20,
    round: 9999,
  },
  typography: {
    h1: { fontSize: 24, fontWeight: '700' as const },
    h2: { fontSize: 20, fontWeight: '600' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    caption: { fontSize: 13, fontWeight: '400' as const },
  }
};

export type Theme = typeof theme;