import { describe, expect, it, vi } from 'vitest';
import type { ReceiptDiagnosticAttempt } from '../geminiService';
import { runReceiptDiagnostics } from './receiptDiagnosticRunner';

const receipt = { storeName: 'private shop', purchaseDate: '2026-11-26 10:30', totalAmount: 703, taxAmount: 0, items: [{ name: 'private item', price: 1000, quantity: 1 }, { name: 'discount', price: -297, quantity: 1 }] };
function attempt(phase: 'initial' | 'repair'): ReceiptDiagnosticAttempt {
  return { phase, data: receipt, arithmeticDiff: 4, durationMs: 10, promptTemplateId: 2, promptTemplateVersion: 3, promptFingerprint: 'fingerprint', promptSource: 'template', promptTokens: 20, responseTokens: 10, pricingRevisionId: 7, estimatedCostJpy: '0.001' };
}

describe('receipt diagnostic runner', () => {
  it('records both attempts and continues after an arithmetic mismatch without printing receipt content', async () => {
    const analyze = vi.fn(async (observer) => { observer(attempt('initial')); observer(attempt('repair')); throw new Error('mismatch'); });
    const report = await runReceiptDiagnostics({ runs: 2, analyze, classify: () => 'arithmetic_mismatch', showValues: false, expected: receipt });
    expect(analyze).toHaveBeenCalledTimes(2);
    expect(report.trials).toHaveLength(2);
    expect(report.summary).toMatchObject({ success: 0, arithmeticMismatch: 2 });
    expect(report.trials[0]).toMatchObject({ status: 'arithmetic_mismatch', attempts: [{ phase: 'initial' }, { phase: 'repair' }] });
    expect(report.coreFieldsStable).toBeNull();
    expect(report.observedFinalFieldsStable).toEqual({ storeName: true, purchaseDate: true, totalAmount: true });
    expect(JSON.stringify(report)).not.toContain('private');
  });
  it('stops after a service failure without issuing further calls', async () => {
    const analyze = vi.fn().mockRejectedValue(new Error('503'));
    const report = await runReceiptDiagnostics({ runs: 3, analyze, classify: () => 'service_unavailable', showValues: false });
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(report).toMatchObject({ stoppedEarly: true, completedRuns: 1, coreFieldsStable: null });
  });
  it('only includes extracted values when explicitly requested', async () => {
    const analyze = async (observer: (a: ReceiptDiagnosticAttempt) => void) => { observer(attempt('initial')); return receipt; };
    const safe = await runReceiptDiagnostics({ runs: 1, analyze, classify: () => 'analysis_error', showValues: false });
    const detailed = await runReceiptDiagnostics({ runs: 1, analyze, classify: () => 'analysis_error', showValues: true });
    expect(JSON.stringify(safe)).not.toContain('private shop');
    expect(JSON.stringify(detailed)).toContain('private shop');
    expect(safe.coreFieldsStable).toBeNull();
  });
  it('does not label missing fields as a successful stable result', async () => {
    const report = await runReceiptDiagnostics({ runs: 1, analyze: async () => ({ ...receipt, storeName: '' }), classify: () => 'analysis_error', showValues: false });
    expect(report.trials[0].status).toBe('incomplete');
    expect(report.coreFieldsStable).toBeNull();
  });
});
