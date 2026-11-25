import { describe, expect, it } from 'vitest';
import { isValidReceiptDate, resolveReviewButton } from './receiptReviewButton';

describe('receipt review button', () => {
  it('waits for a lookup for the current fields', () => {
    expect(resolveReviewButton('new', { key: 'old', status: 'ready', count: 0 })).toEqual({ pending: true, failed: false, label: '確認中' });
  });
  it('switches between registration and comparing candidates', () => {
    expect(resolveReviewButton('x', { key: 'x', status: 'ready', count: 0 }).label).toBe('登録');
    expect(resolveReviewButton('x', { key: 'x', status: 'ready', count: 2 }).label).toBe('登録済みと比べる');
  });
  it('requires retry when candidate lookup failed', () => {
    expect(resolveReviewButton('x', { key: 'x', status: 'error', count: 0 })).toEqual({ pending: false, failed: true, label: '再確認' });
  });
});

it('recognizes valid dates and rejects impossible dates and times', () => {
  expect(isValidReceiptDate('2026-11-23 17:27')).toBe(true);
  expect(isValidReceiptDate('2026-11-23')).toBe(true);
  expect(isValidReceiptDate('2026-02-30')).toBe(false);
  expect(isValidReceiptDate('2026-11-23 25:00')).toBe(false);
});
