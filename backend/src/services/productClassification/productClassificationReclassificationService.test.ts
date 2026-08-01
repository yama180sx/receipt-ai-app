import {
  ClassificationConfidence,
  ClassificationSource,
  ProductClassificationReclassificationItemOutcome,
  ProductClassificationReclassificationRunStatus,
  ProductTypeStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  findItemsForProductClassificationReclassification: vi.fn(),
  createProductClassificationReclassificationRun: vi.fn(),
  findItemForProductClassificationReclassificationInTx: vi.fn(),
  replaceProductClassificationCandidatesInTx: vi.fn(),
  createProductClassificationReclassificationItemAuditInTx: vi.fn(),
  completeProductClassificationReclassificationRun: vi.fn(),
}));
const receiptRepositoryMocks = vi.hoisted(() => ({ updateItemCategoryInTx: vi.fn() }));
const transactionMocks = vi.hoisted(() => ({
  runInTransaction: vi.fn((fn: (tx: object) => unknown) => fn({})),
}));
const classificationMocks = vi.hoisted(() => ({
  classifyItemWithSimilarityCandidates: vi.fn(),
  toProductClassificationCandidateInputs: vi.fn((candidates) => candidates),
}));

vi.mock('../../repositories/productClassificationRepository', () => repositoryMocks);
vi.mock('../../repositories/receiptRepository', () => receiptRepositoryMocks);
vi.mock('../../utils/prismaTransaction', () => transactionMocks);
vi.mock('./productClassificationService', () => classificationMocks);

import { reclassifyProductClassificationItems } from './productClassificationReclassificationService';

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    name: 'GRダカラやさしい麦茶2Lx6',
    categoryId: 1,
    standardCategoryId: null,
    productTypeId: null,
    productTypeStatus: ProductTypeStatus.UNCLASSIFIED,
    classificationSource: null,
    classificationConfidence: null,
    productClassificationCandidates: [],
    receipt: { familyGroupId: 1 },
    ...overrides,
  };
}

describe('reclassifyProductClassificationItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMocks.findItemsForProductClassificationReclassification.mockResolvedValue([{ id: 10 }]);
    repositoryMocks.createProductClassificationReclassificationRun.mockResolvedValue({ id: 71 });
    repositoryMocks.findItemForProductClassificationReclassificationInTx.mockResolvedValue(item());
    repositoryMocks.completeProductClassificationReclassificationRun.mockImplementation(
      async (id, data) => ({ id, ...data, itemAudits: [] })
    );
    classificationMocks.classifyItemWithSimilarityCandidates.mockResolvedValue({
      classification: {
        categoryId: 1,
        standardCategoryId: 14,
        productTypeId: 24,
        productTypeStatus: ProductTypeStatus.CLASSIFIED,
        classificationSource: ClassificationSource.STANDARD_DICTIONARY,
        classificationConfidence: ClassificationConfidence.HIGH,
      },
      candidates: [],
    });
  });

  it('updates only the requested household target and records its before/after values', async () => {
    const result = await reclassifyProductClassificationItems(1, 1, {
      statuses: [ProductTypeStatus.UNCLASSIFIED],
      limit: 100,
    });

    expect(repositoryMocks.findItemsForProductClassificationReclassification).toHaveBeenCalledWith(
      expect.objectContaining({ familyGroupId: 1, statuses: [ProductTypeStatus.UNCLASSIFIED] })
    );
    expect(receiptRepositoryMocks.updateItemCategoryInTx).toHaveBeenCalledWith(
      expect.anything(),
      10,
      expect.objectContaining({ productTypeId: 24 })
    );
    expect(repositoryMocks.createProductClassificationReclassificationItemAuditInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        runId: 71,
        itemId: 10,
        outcome: ProductClassificationReclassificationItemOutcome.UPDATED,
        previousProductTypeId: null,
        nextProductTypeId: 24,
      })
    );
    expect(result).toMatchObject({
      updatedCount: 1,
      unchangedCount: 0,
      failedCount: 0,
      status: ProductClassificationReclassificationRunStatus.COMPLETED,
    });
  });

  it('does not rewrite or duplicate an audit when classification and candidates are unchanged', async () => {
    const unchanged = item({
      standardCategoryId: 14,
      productTypeId: 24,
      productTypeStatus: ProductTypeStatus.CLASSIFIED,
      classificationSource: ClassificationSource.STANDARD_DICTIONARY,
      classificationConfidence: ClassificationConfidence.HIGH,
    });
    repositoryMocks.findItemForProductClassificationReclassificationInTx.mockResolvedValue(unchanged);

    const result = await reclassifyProductClassificationItems(1, 1, {
      statuses: [ProductTypeStatus.UNCLASSIFIED],
      limit: 100,
    });

    expect(receiptRepositoryMocks.updateItemCategoryInTx).not.toHaveBeenCalled();
    expect(repositoryMocks.createProductClassificationReclassificationItemAuditInTx).not.toHaveBeenCalled();
    expect(result).toMatchObject({ updatedCount: 0, unchangedCount: 1, failedCount: 0 });
  });

  it('does not update a concurrently manual-classified item', async () => {
    repositoryMocks.findItemForProductClassificationReclassificationInTx.mockResolvedValue(
      item({ productTypeStatus: ProductTypeStatus.CLASSIFIED, classificationSource: ClassificationSource.MANUAL })
    );

    const result = await reclassifyProductClassificationItems(1, 1, {
      statuses: [ProductTypeStatus.UNCLASSIFIED, ProductTypeStatus.NEEDS_REVIEW],
      limit: 100,
    });

    expect(receiptRepositoryMocks.updateItemCategoryInTx).not.toHaveBeenCalled();
    expect(result).toMatchObject({ updatedCount: 0, unchangedCount: 1, failedCount: 0 });
  });

  it('keeps other results and records a failed item when one transaction fails', async () => {
    repositoryMocks.findItemForProductClassificationReclassificationInTx
      .mockRejectedValueOnce(new Error('database timeout'))
      .mockResolvedValueOnce(item());

    const result = await reclassifyProductClassificationItems(1, 1, {
      statuses: [ProductTypeStatus.UNCLASSIFIED],
      limit: 100,
    });

    expect(repositoryMocks.createProductClassificationReclassificationItemAuditInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        outcome: ProductClassificationReclassificationItemOutcome.FAILED,
        errorMessage: 'database timeout',
      })
    );
    expect(result).toMatchObject({
      updatedCount: 0,
      unchangedCount: 0,
      failedCount: 1,
      status: ProductClassificationReclassificationRunStatus.PARTIAL_FAILURE,
    });
  });
});
