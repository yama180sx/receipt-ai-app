import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ bootstrap: vi.fn() }));

vi.mock('../../repositories/globalAiBudgetRepository', () => ({
  bootstrapGlobalAiBudgetManager: mocks.bootstrap,
}));

import { bootstrapAiBudgetManager } from './globalAiBudgetManagerBootstrapService';

describe('全体AI予算管理者の初期登録サービス', () => {
  beforeEach(() => mocks.bootstrap.mockReset());

  it('実行者と理由をリポジトリへ渡す', async () => {
    mocks.bootstrap.mockResolvedValue({ manager: { id: 1 }, member: { id: 42 } });
    await expect(bootstrapAiBudgetManager({ memberId: 42, operatorName: 't320-deployer', reason: 'initial registration' })).resolves.toMatchObject({ member: { id: 42 } });
    expect(mocks.bootstrap).toHaveBeenCalledWith({ memberId: 42, operatorName: 't320-deployer', reason: 'initial registration' });
  });

  it('実行者または理由が空ならリポジトリを呼ばない', async () => {
    await expect(bootstrapAiBudgetManager({ memberId: 42, operatorName: ' ', reason: 'initial registration' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(bootstrapAiBudgetManager({ memberId: 42, operatorName: 't320-deployer', reason: ' ' })).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });
});
