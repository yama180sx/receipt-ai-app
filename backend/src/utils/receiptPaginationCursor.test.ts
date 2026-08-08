import { afterEach, describe, expect, it } from 'vitest';
import { AppError } from './appError';
import { decodeReceiptCursor, encodeReceiptCursor } from './receiptPaginationCursor';

const filters = { month: '2026-08', memberId: 1, query: '牛乳' };
const originalJwtSecret = process.env.JWT_SECRET;

afterEach(() => {
  process.env.JWT_SECRET = originalJwtSecret;
});

describe('receiptPaginationCursor', () => {
  it('encodes and decodes a cursor for the same filters', () => {
    process.env.JWT_SECRET = 'test-secret';
    const position = { date: new Date('2026-08-08T10:00:00.000Z'), id: 42 };

    const cursor = encodeReceiptCursor(position, filters);

    expect(decodeReceiptCursor(cursor, filters)).toEqual(position);
  });

  it('rejects a cursor that was issued for different filters', () => {
    process.env.JWT_SECRET = 'test-secret';
    const cursor = encodeReceiptCursor({ date: new Date('2026-08-08T10:00:00.000Z'), id: 42 }, filters);

    expect(() => decodeReceiptCursor(cursor, { ...filters, query: '卵' })).toThrowError(AppError);
    expect(() => decodeReceiptCursor(cursor, { ...filters, query: '卵' })).toThrow('InvalidCursor');
  });

  it('rejects a tampered cursor', () => {
    process.env.JWT_SECRET = 'test-secret';
    const cursor = encodeReceiptCursor({ date: new Date('2026-08-08T10:00:00.000Z'), id: 42 }, filters);
    const tampered = `${cursor.slice(0, -1)}x`;

    expect(() => decodeReceiptCursor(tampered, filters)).toThrow('InvalidCursor');
  });
});
