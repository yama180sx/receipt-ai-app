import { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';

import { useAppSessionContext } from '../contexts/AppSessionContext';

export function useAppNavigation() {
  const router = useRouter();
  const session = useAppSessionContext();

  /** ホームへ（管理メニュー等からの「戻る」用。スタックをリセット） */
  const goHome = useCallback(() => {
    router.replace('/');
  }, [router]);

  /** 1 つ前へ戻る。履歴がなければ fallback へ replace */
  const goBackOrReplace = useCallback(
    (fallback: Href) => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(fallback);
      }
    },
    [router]
  );

  const goBackOrHome = useCallback(() => {
    goBackOrReplace('/');
  }, [goBackOrReplace]);

  const logout = useCallback(async () => {
    await session.handleLogout();
    router.replace('/login');
  }, [router, session]);

  return {
    router,
    goHome,
    goBackOrReplace,
    goBackOrHome,
    logout,
    session,
  };
}
