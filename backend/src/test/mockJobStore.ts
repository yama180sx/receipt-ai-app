export type MockReceiptJob = {
  id: string;
  data: { memberId?: number; familyGroupId?: number; imagePath?: string };
  returnvalue: unknown;
  failedReason: string | null;
  timestamp: number;
  getState: () => Promise<string>;
  remove: () => Promise<void>;
};

export const mockReceiptJobs = new Map<string, MockReceiptJob>();

export function registerMockReceiptJob(
  id: string,
  data: { memberId: number; familyGroupId: number; imagePath?: string },
  options?: {
    state?: string;
    returnvalue?: unknown;
    failedReason?: string | null;
    timestamp?: number;
  }
): void {
  const state = options?.state ?? 'completed';
  mockReceiptJobs.set(id, {
    id,
    data,
    returnvalue: options?.returnvalue ?? null,
    failedReason: options?.failedReason ?? null,
    timestamp: options?.timestamp ?? Date.now(),
    getState: async () => state,
    remove: async () => {
      mockReceiptJobs.delete(id);
    },
  });
}

export function clearMockReceiptJobs(): void {
  mockReceiptJobs.clear();
}
