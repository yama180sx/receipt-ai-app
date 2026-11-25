import { expect, it } from 'vitest';
import { RECEIPT_JOB_OPTIONS } from './receiptQueueOptions';

it('retains completed and failed receipt jobs until explicitly removed', () => {
  expect(RECEIPT_JOB_OPTIONS.removeOnComplete).toBe(false);
  expect(RECEIPT_JOB_OPTIONS.removeOnFail).toBe(false);
});
