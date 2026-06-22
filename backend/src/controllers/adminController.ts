import { AppError } from '../utils/appError';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import { asyncHandler } from '../utils/asyncHandler';
import { sendMessage, sendSuccess } from '../utils/sendApiResponse';
import {
  listPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  activatePromptTemplate,
  deletePromptTemplate,
  getAdminCostStats,
} from '../services/admin/adminService';

function parsePromptId(req: Parameters<typeof getRouteParam>[0]): number {
  const id = getRouteParam(req, 'id');
  if (!id || isNaN(Number(id))) {
    throw new AppError('無効なIDが指定されました', 400);
  }
  return Number(id);
}

export const getPrompts = asyncHandler(async (_req, res) => {
  const prompts = await listPromptTemplates(requireTenantContext());
  sendSuccess(res, prompts);
});

export const createPrompt = asyncHandler(async (req, res) => {
  const newPrompt = await createPromptTemplate(requireTenantContext(), req.body);
  sendSuccess(res, newPrompt);
});

export const updatePrompt = asyncHandler(async (req, res) => {
  const updated = await updatePromptTemplate(
    requireTenantContext(),
    parsePromptId(req),
    req.body
  );
  sendSuccess(res, updated);
});

export const activatePrompt = asyncHandler(async (req, res) => {
  await activatePromptTemplate(requireTenantContext(), parsePromptId(req));
  sendMessage(res, 'デフォルトを切り替えました');
});

export const deletePrompt = asyncHandler(async (req, res) => {
  await deletePromptTemplate(requireTenantContext(), parsePromptId(req));
  sendMessage(res, '削除しました');
});

export const getCostStats = asyncHandler(async (_req, res) => {
  const result = await getAdminCostStats(requireTenantContext());
  sendSuccess(res, result);
});
