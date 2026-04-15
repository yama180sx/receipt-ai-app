import { AsyncLocalStorage } from 'node:async_hooks';
import logger from './logger';

export interface TenantContext {
  familyGroupId: number;
  memberId: number;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * 現在のコンテキストから世帯IDを取得
 */
export const getFamilyGroupId = (): number => {
  const store = tenantStorage.getStore();
  if (!store) {
    logger.error('[CONTEXT-ERROR] familyGroupId access attempted without context.');
    throw new Error('Tenant context (familyGroupId) is not set. Check if middleware is applied.');
  }
  return store.familyGroupId;
};

/**
 * 現在のコンテキストからメンバーIDを取得
 */
export const getMemberId = (): number => {
  const store = tenantStorage.getStore();
  if (!store) {
    logger.error('[CONTEXT-ERROR] memberId access attempted without context.');
    throw new Error('Tenant context (memberId) is not set. Check if middleware is applied.');
  }
  return store.memberId;
};

export const hasContext = (): boolean => !!tenantStorage.getStore();

/**
 * ALC内で関数を実行するためのラッパー
 */
export const runWithTenant = <T>(context: TenantContext, fn: () => T): T => {
  return tenantStorage.run(context, fn);
};