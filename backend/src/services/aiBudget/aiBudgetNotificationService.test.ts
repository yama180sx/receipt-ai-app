import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(), pending: vi.fn(), enqueue: vi.fn(), find: vi.fn(), start: vi.fn(), complete: vi.fn(), fail: vi.fn(), audit: vi.fn(),
}));

vi.mock('../../repositories/aiBudgetNotificationRepository', () => ({
  createNotificationDeliveries: mocks.create,
  listPendingNotificationDeliveries: mocks.pending,
  findNotificationDelivery: mocks.find,
  startNotificationDelivery: mocks.start,
  completeNotificationDelivery: mocks.complete,
  failNotificationDelivery: mocks.fail,
}));
vi.mock('../../queues/aiBudgetNotificationQueue', () => ({ enqueueAiBudgetNotification: mocks.enqueue }));
vi.mock('../../repositories/globalAiBudgetRepository', () => ({ createGlobalAiBudgetAudit: mocks.audit }));
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));

import { createTestNotifications, createThresholdNotifications, validNotificationEmail } from './aiBudgetNotificationService';

describe('AI予算通知', () => {
  it('メールアドレスの基本形式を検証する', () => {
    expect(validNotificationEmail('admin@example.com')).toBe(true);
    expect(validNotificationEmail('not-an-email')).toBe(false);
  });

  it('しきい値通知を通知先ごとに作成し、未完了配送をキューへ投入する', async () => {
    mocks.pending.mockResolvedValue([{ id: 11 }, { id: 12 }]);
    await createThresholdNotifications({ notifyDiscord: true, notificationEmails: ['admin@example.com'] }, '2026-09', 80);
    expect(mocks.create).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ dedupeKey: 'threshold:2026-09:80:DISCORD:configured-discord-webhook' }),
      expect.objectContaining({ dedupeKey: 'threshold:2026-09:80:EMAIL:admin@example.com' }),
    ]));
    expect(mocks.enqueue).toHaveBeenCalledWith(11);
    expect(mocks.enqueue).toHaveBeenCalledWith(12);
  });

  it('未選択の通知方式には試験通知を作成しない', async () => {
    await expect(createTestNotifications({ notifyDiscord: false, notificationEmails: [] }, ['DISCORD'])).rejects.toMatchObject({ statusCode: 400 });
  });
});
