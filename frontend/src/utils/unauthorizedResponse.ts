/**
 * ログイン失敗の401は、既存セッションの失効ではない。
 * 保護APIの401だけをアプリ全体のログアウト対象にする。
 */
export function shouldClearSessionAfterUnauthorized(requestUrl: string | undefined): boolean {
  if (!requestUrl) return true;

  const path = requestUrl
    .replace(/^https?:\/\/[^/]+/i, '')
    .split(/[?#]/, 1)[0]
    .replace(/^\/+/, '');

  return path !== 'auth/login' && path !== 'api/auth/login';
}
