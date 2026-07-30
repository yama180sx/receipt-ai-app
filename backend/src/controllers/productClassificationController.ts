import { listProductClassificationLearningData, deactivateLearningData } from '../services/productClassification/productClassificationLearningDataService';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import { AppError } from '../utils/appError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/sendApiResponse';
import { mapProductClassificationLearningData } from '../mappers/productClassificationMapper';

const learningDataTypes = new Set(['household_dictionary', 'alias']);

export const getProductClassificationLearningData = asyncHandler(async (_req, res) => {
  const { familyGroupId } = requireTenantContext();
  sendSuccess(res, mapProductClassificationLearningData(await listProductClassificationLearningData(familyGroupId)));
});

export const deactivateProductClassificationLearningData = asyncHandler(async (req, res) => {
  const { familyGroupId, memberId } = requireTenantContext();
  const type = getRouteParam(req, 'type');
  if (!learningDataTypes.has(type)) throw new AppError('LearningDataTypeNotDeactivatable', 400);
  const id = Number(getRouteParam(req, 'id'));
  if (!Number.isInteger(id) || id < 1) throw new AppError('InvalidLearningDataId', 400);
  sendSuccess(res, mapProductClassificationLearningData([
    await deactivateLearningData(familyGroupId, memberId, type as 'household_dictionary' | 'alias', id, req.body.reason),
  ])[0]);
});
