import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  candidates: vi.fn(),
  remove: vi.fn(),
  audit: vi.fn(),
}));

vi.mock('../../repositories/globalAiBudgetRepository', () => ({
  addGlobalAiBudgetManager: vi.fn(),
  createGlobalAiBudgetAudit: mocks.audit,
  findEligibleGlobalAiBudgetManagerMember: vi.fn(),
  findGlobalAiBudgetSetting: vi.fn(),
  listGlobalAiBudgetManagerCandidates: mocks.candidates,
  listGlobalAiBudgetManagers: vi.fn(),
  removeGlobalAiBudgetManager: mocks.remove,
  resumeGlobalAiBudget: vi.fn(),
  upsertGlobalAiBudgetSetting: vi.fn(),
}));
vi.mock('./globalAiCostService', () => ({ getGlobalAiCostStats: vi.fn() }));
vi.mock('./aiBudgetNotificationService', () => ({ createTestNotifications: vi.fn(), validNotificationEmail: vi.fn() }));
vi.mock('../../repositories/aiBudgetNotificationRepository', () => ({ listNotificationDeliveries: vi.fn() }));

import { getGlobalAiBudgetManagerCandidates, removeAiBudgetManager } from './globalAiBudgetAdminService';

describe('全体AI予算管理者の運用サービス', () => {
  it('候補一覧はリポジトリの最小情報をそのまま返す', async () => {
    mocks.candidates.mockResolvedValue([{ id: 2, name: 'candidate' }]);
    await expect(getGlobalAiBudgetManagerCandidates()).resolves.toEqual([{ id: 2, name: 'candidate' }]);
  });

  it('最後の有効な管理者と未登録者の削除を区別して拒否する', async () => {
    mocks.remove.mockResolvedValueOnce('last_effective_manager');
    await expect(removeAiBudgetManager(1, 2, 'handover')).rejects.toMatchObject({ statusCode: 409 });
    mocks.remove.mockResolvedValueOnce('not_found');
    await expect(removeAiBudgetManager(1, 2, 'handover')).rejects.toMatchObject({ statusCode: 404 });
  });
});
