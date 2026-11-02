export type AppEnv = 'dev' | 'kagoya' | 'stable';

export function getAppEnv(): AppEnv {
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV;
  return appEnv === 'dev' || appEnv === 'kagoya' ? appEnv : 'stable';
}

export function isDevAppEnv(): boolean {
  return getAppEnv() === 'dev';
}

export function getAppDisplayName(): string {
  if (isDevAppEnv()) return 'RecAIpt (dev)';
  return getAppEnv() === 'kagoya' ? 'RecAIpt (KAGOYA)' : 'RecAIpt';
}

/** ホーム見出し: 「{名前}のメニュー」 */
export function getMemberMenuTitle(memberName: string | null | undefined): string {
  const trimmed = memberName?.trim();
  if (!trimmed) return 'RecAIpt メニュー';
  return `${trimmed}のメニュー`;
}

/** dev 環境のみ UI に使うアクセント（stable は theme.colors をそのまま利用） */
export const devUiColors = {
  bannerBg: '#b45309',
  bannerText: '#ffffff',
  toolbarBg: '#fffbeb',
  toolbarBorder: '#fcd34d',
  loginPrimary: '#b45309',
} as const;
