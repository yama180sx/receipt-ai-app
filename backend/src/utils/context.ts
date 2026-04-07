import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * [Issue #45] マルチテナント・コンテキスト型定義
 */
export interface TenantContext {
  familyGroupId: number;
  memberId: number;
}

/**
 * AsyncLocalStorage インスタンス
 * リクエストごとのスレッドローカル・ストレージ
 */
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * 現在のコンテキストから世帯ID (familyGroupId) を取得
 */
export const getFamilyGroupId = (): number => {
  const store = tenantStorage.getStore();
  if (!store) {
    // Seed実行時や非HTTPリクエスト下での動作を許容するためのデフォルト値
    return 1; 
  }
  return store.familyGroupId;
};

/**
 * 現在のコンテキストからメンバーID (memberId) を取得
 */
export const getMemberId = (): number => {
  const store = tenantStorage.getStore();
  if (!store) {
    return 1;
  }
  return store.memberId;
};

/**
 * コンテキストが有効かどうかを判定
 */
export const hasContext = (): boolean => {
  return !!tenantStorage.getStore();
};

/**
 * 指定したコンテキストで処理を実行するヘルパー (30年選手向けに追加)
 * ミドルウェアや非同期ジョブ(Worker)での利用を想定
 */
export const runWithTenant = <T>(context: TenantContext, fn: () => T): T => {
  return tenantStorage.run(context, fn);
};