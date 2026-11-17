type SessionExpiryRecoveryOptions = {
  clearInMemorySession: () => void;
  clearPersistedSession: () => Promise<void>;
  notifyUser: () => void;
  onPersistenceError?: (error: unknown) => void;
};

/**
 * 保護 API の 401 を受けた際の復帰処理。
 *
 * 画面遷移を待たせないよう、React のセッション状態を先に消去する。永続領域の
 * 削除は後続で行い、同時に複数の API が 401 を返しても通知と削除を一度に抑える。
 */
export function createSessionExpiryRecovery({
  clearInMemorySession,
  clearPersistedSession,
  notifyUser,
  onPersistenceError = (error) => console.warn('認証情報の削除に失敗しました:', error),
}: SessionExpiryRecoveryOptions) {
  let recovering = false;

  const recover = (): boolean => {
    if (recovering) return false;

    recovering = true;
    clearInMemorySession();
    notifyUser();
    void clearPersistedSession().catch(onPersistenceError);
    return true;
  };

  /** 次の正常ログイン後は、将来の失効を再び検知できるようにする。 */
  const reset = () => {
    recovering = false;
  };

  return { recover, reset };
}
