import { describe, expect, it, vi } from 'vitest';
import { runReceiptDiagnosticBatch } from './receiptDiagnosticBatch';

describe('receipt diagnostic batch', () => {
  it('processes sequentially and retains arithmetic failures for later review', async () => {
    const analyze = vi.fn().mockResolvedValueOnce({ trials: [{ status: 'arithmetic_mismatch' }] }).mockResolvedValueOnce({ trials: [{ status: 'success' }] });
    const save = vi.fn();
    const result = await runReceiptDiagnosticBatch({ files: ['private-1.jpg', 'private-2.jpg'], analyze, save });
    expect(result).toEqual({ requested: 2, completed: 2, reviewRequired: 1, stoppedEarly: false, stoppedReason: null });
    expect(save).toHaveBeenCalledTimes(2);
    expect(analyze.mock.invocationCallOrder[1]).toBeGreaterThan(save.mock.invocationCallOrder[0]);
    expect(JSON.stringify(result)).not.toContain('private');
  });
  it.each(['rate_limited', 'service_unavailable', 'budget_stopped', 'configuration_unavailable', 'analysis_error'])('stops after %s', async (status) => {
    const analyze = vi.fn().mockResolvedValue({ trials: [{ status }] });
    const save = vi.fn();
    const result = await runReceiptDiagnosticBatch({ files: ['one', 'two'], analyze, save });
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledOnce();
    expect(result).toEqual({ requested: 2, completed: 1, reviewRequired: 1, stoppedEarly: true, stoppedReason: status });
  });
  it('does not proceed if saving a result fails', async () => {
    const analyze = vi.fn().mockResolvedValue({ trials: [{ status: 'success' }] });
    const save = vi.fn(() => { throw new Error('write failed'); });
    await expect(runReceiptDiagnosticBatch({ files: ['one', 'two'], analyze, save })).rejects.toThrow();
    expect(analyze).toHaveBeenCalledOnce();
  });
});
