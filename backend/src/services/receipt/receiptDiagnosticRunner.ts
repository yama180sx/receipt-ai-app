import type { ParsedReceipt } from '../../types/receipt';
import type { ReceiptDiagnosticAttempt } from '../geminiService';
import { compareReceiptToExpected, type ExpectedReceipt } from './receiptDiagnosticReport';

export type DiagnosticFailure = 'arithmetic_mismatch' | 'rate_limited' | 'service_unavailable' | 'budget_stopped' | 'configuration_unavailable' | 'analysis_error';
type Analyze = (observer: (attempt: ReceiptDiagnosticAttempt) => void) => Promise<ParsedReceipt>;

export async function runReceiptDiagnostics(input: {
  runs: number;
  analyze: Analyze;
  classify: (error: unknown) => DiagnosticFailure;
  expected?: ExpectedReceipt;
  showValues: boolean;
}) {
  const trials: Array<{ run: number; status: string; elapsedMs: number; attempts: Array<Record<string, unknown>> }> = [];
  const signatures: string[] = [];
  const observedFinalFields: Array<{ storeName: string | null; purchaseDate: string | null; totalAmount: number | null }> = [];
  for (let i = 0; i < input.runs; i += 1) {
    const attempts: Array<Record<string, unknown>> = [];
    const started = Date.now();
    let status = 'success';
    let stop = false;
    let lastData: ParsedReceipt | undefined;
    const observe = (attempt: ReceiptDiagnosticAttempt) => {
      lastData = attempt.data;
      const output: Record<string, unknown> = {
        phase: attempt.phase,
        arithmeticDiff: attempt.arithmeticDiff,
        itemCount: attempt.data.items.length,
        negativeItemCount: attempt.data.items.filter((item) => typeof item.price === 'number' && item.price < 0).length,
        durationMs: attempt.durationMs,
        promptTemplateId: attempt.promptTemplateId,
        promptTemplateVersion: attempt.promptTemplateVersion,
        promptFingerprint: attempt.promptFingerprint,
        promptSource: attempt.promptSource,
        promptTokens: attempt.promptTokens,
        responseTokens: attempt.responseTokens,
        pricingRevisionId: attempt.pricingRevisionId,
        estimatedCostJpy: attempt.estimatedCostJpy,
      };
      if (input.expected) output.comparison = compareReceiptToExpected(attempt.data, input.expected);
      if (input.showValues) output.extracted = { storeName: attempt.data.storeName, purchaseDate: attempt.data.purchaseDate, totalAmount: attempt.data.totalAmount, taxAmount: attempt.data.taxAmount, items: attempt.data.items.map(({ name, price, quantity }) => ({ name, price, quantity })) };
      attempts.push(output);
    };
    try {
      const result = await input.analyze(observe);
      if (typeof result.storeName !== 'string' || !result.storeName.trim() || typeof result.purchaseDate !== 'string' || !result.purchaseDate.trim() || typeof result.totalAmount !== 'number' || !Number.isFinite(result.totalAmount)) status = 'incomplete';
      else signatures.push(JSON.stringify([result.storeName, result.purchaseDate, result.totalAmount]));
    } catch (error) {
      status = input.classify(error);
      stop = status !== 'arithmetic_mismatch';
    }
    trials.push({ run: i + 1, status, elapsedMs: Date.now() - started, attempts });
    observedFinalFields.push({
      storeName: typeof lastData?.storeName === 'string' && lastData.storeName.trim() ? lastData.storeName : null,
      purchaseDate: typeof lastData?.purchaseDate === 'string' && lastData.purchaseDate.trim() ? lastData.purchaseDate : null,
      totalAmount: typeof lastData?.totalAmount === 'number' && Number.isFinite(lastData.totalAmount) ? lastData.totalAmount : null,
    });
    if (stop) break;
  }
  const fieldStable = (field: 'storeName' | 'purchaseDate' | 'totalAmount') => {
    const values = observedFinalFields.map((row) => row[field]);
    return input.runs >= 2 && values.length === input.runs && values.every((value) => value !== null) ? new Set(values).size === 1 : null;
  };
  const count = (status: string) => trials.filter((trial) => trial.status === status).length;
  return {
    requestedRuns: input.runs,
    completedRuns: trials.length,
    stoppedEarly: trials.length < input.runs,
    expectedProvided: Boolean(input.expected),
    valuesShown: input.showValues,
    summary: {
      success: count('success'),
      incomplete: count('incomplete'),
      arithmeticMismatch: count('arithmetic_mismatch'),
      rateLimited: count('rate_limited'),
      serviceUnavailable: count('service_unavailable'),
      budgetStopped: count('budget_stopped'),
      configurationUnavailable: count('configuration_unavailable'),
      analysisError: count('analysis_error'),
    },
    coreFieldsStable: input.runs >= 2 && signatures.length === input.runs ? new Set(signatures).size === 1 : null,
    observedFinalFieldsStable: { storeName: fieldStable('storeName'), purchaseDate: fieldStable('purchaseDate'), totalAmount: fieldStable('totalAmount') },
    trials,
  };
}
