import { AppError } from '../../utils/appError';
import {
  deactivateProductClassificationLearningDataInTx,
  findProductClassificationLearningData,
} from '../../repositories/productClassificationRepository';
import { runInTransaction } from '../../utils/prismaTransaction';

export type ProductClassificationLearningDataRecord = {
  id: number;
  type: 'household_dictionary' | 'alias' | 'history';
  normalizedName: string;
  productType: { id: number; code: string; name: string; standardCategoryId: number };
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  lastDeactivationAudit: {
    reason: string;
    actorMemberName: string | null;
    familyGroupName: string;
    createdAt: Date;
  } | null;
};

export async function listProductClassificationLearningData(familyGroupId: number) {
  const { dictionaries, aliases, histories, events } = await findProductClassificationLearningData(familyGroupId);
  const latestEventByLearningData = new Map(
    events.map((event) => [`${event.learningDataType.toLowerCase()}-${event.learningDataId}`, event])
  );
  const toAudit = (type: 'household_dictionary' | 'alias', id: number) => {
    const event = latestEventByLearningData.get(`${type}-${id}`);
    return event ? {
      reason: event.reason,
      actorMemberName: event.actorMember?.name ?? null,
      familyGroupName: event.familyGroup.name,
      createdAt: event.createdAt,
    } : null;
  };
  return [
    ...dictionaries.map((record): ProductClassificationLearningDataRecord => ({ ...record, type: 'household_dictionary', lastDeactivationAudit: toAudit('household_dictionary', record.id) })),
    ...aliases.map((record): ProductClassificationLearningDataRecord => ({ ...record, type: 'alias', lastDeactivationAudit: toAudit('alias', record.id) })),
    ...histories.map((record): ProductClassificationLearningDataRecord => ({ ...record, type: 'history', isActive: null, lastDeactivationAudit: null })),
  ].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
}

export async function deactivateLearningData(
  familyGroupId: number,
  actorMemberId: number,
  type: 'household_dictionary' | 'alias',
  id: number,
  reason: string
) {
  const result = await runInTransaction((tx) => deactivateProductClassificationLearningDataInTx(tx, {
    familyGroupId, actorMemberId, type, id, reason,
  }));
  if (!result) throw new AppError('LearningDataNotFoundOrInactive', 404);
  return {
    ...result.record,
    type,
    lastDeactivationAudit: {
      reason: result.audit.reason,
      actorMemberName: result.audit.actorMember?.name ?? null,
      familyGroupName: result.audit.familyGroup.name,
      createdAt: result.audit.createdAt,
    },
  } as ProductClassificationLearningDataRecord;
}
