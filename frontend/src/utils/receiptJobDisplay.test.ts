import { describe, expect, it } from 'vitest';
import {
  countActiveReceiptJobs,
  getReceiptJobDisplay,
  getReceiptTrayItemTitle,
  sortReceiptTrayItems,
} from './receiptJobDisplay';
import type { ReceiptJobListItem } from '../types/receiptJob';

const baseJob = (overrides: Partial<ReceiptJobListItem>): ReceiptJobListItem => ({
  id: '1',
  state: 'waiting',
  imagePath: null,
  createdAt: 1000,
  ...overrides,
});

describe('getReceiptJobDisplay', () => {
  it('maps active job to 解析中', () => {
    expect(getReceiptJobDisplay(baseJob({ state: 'active' }))).toEqual({
      kind: 'processing',
      label: '解析中',
      isActive: true,
    });
  });

  it('maps completed duplicate to 重複の疑い', () => {
    expect(
      getReceiptJobDisplay(baseJob({ state: 'completed', duplicateSuspected: true }))
    ).toMatchObject({ kind: 'duplicate_suspected', label: '重複の疑い' });
  });

  it('maps completed job to 確認待ち', () => {
    expect(getReceiptJobDisplay(baseJob({ state: 'completed' }))).toMatchObject({
      kind: 'ready',
      label: '確認待ち',
    });
  });
});

describe('getReceiptTrayItemTitle', () => {
  it('uses store name when parsed', () => {
    expect(
      getReceiptTrayItemTitle(
        baseJob({
          state: 'completed',
          parsedData: {
            storeName: 'セブン-イレブン',
            purchaseDate: '2026-01-01',
            totalAmount: 500,
            itemCount: 2,
          },
        })
      )
    ).toBe('セブン-イレブン');
  });

  it('labels local upload failure', () => {
    expect(
      getReceiptTrayItemTitle({
        id: 'local-1',
        state: 'failed',
        createdAt: 1,
        failedReason: 'network',
        localOnly: true,
      })
    ).toBe('アップロード失敗');
  });
});

describe('countActiveReceiptJobs', () => {
  it('counts waiting and active only', () => {
    const jobs = [
      baseJob({ id: 'a', state: 'waiting' }),
      baseJob({ id: 'b', state: 'active' }),
      baseJob({ id: 'c', state: 'completed' }),
    ];
    expect(countActiveReceiptJobs(jobs)).toBe(2);
  });
});

describe('sortReceiptTrayItems', () => {
  it('sorts newest first', () => {
    const sorted = sortReceiptTrayItems([
      baseJob({ id: 'old', createdAt: 1 }),
      baseJob({ id: 'new', createdAt: 99 }),
    ]);
    expect(sorted.map((j) => j.id)).toEqual(['new', 'old']);
  });
});
