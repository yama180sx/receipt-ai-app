export type MockReceiptJob = {
  id: string;
  data: { memberId?: number; familyGroupId?: number; imagePath?: string };
  returnvalue: unknown;
  failedReason: string | null;
  getState: () => Promise<string>;
};

export const mockReceiptJobs = new Map<string, MockReceiptJob>();

export function registerMockReceiptJob(
  id: string,
  data: { memberId: number; familyGroupId: number; imagePath?: string }
): void {
  mockReceiptJobs.set(id, {
    id,
    data,
    returnvalue: null,
    failedReason: null,
    getState: async () => 'completed',
  });
}

export function clearMockReceiptJobs(): void {
  mockReceiptJobs.clear();
}
