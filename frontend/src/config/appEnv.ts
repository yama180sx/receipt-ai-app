export type AppEnv = 'dev' | 'stable';

export function getAppEnv(): AppEnv {
  return process.env.EXPO_PUBLIC_APP_ENV === 'dev' ? 'dev' : 'stable';
}

export function isDevAppEnv(): boolean {
  return getAppEnv() === 'dev';
}

export function getAppDisplayName(): string {
  return isDevAppEnv() ? 'RecAIpt (dev)' : 'RecAIpt';
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
