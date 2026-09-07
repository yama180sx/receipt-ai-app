import { AppError } from '../utils/appError';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import { asyncHandler } from '../utils/asyncHandler';
import { sendMessage, sendSuccess } from '../utils/sendApiResponse';
import {
  mapAdminCostStatsToApi,
  mapPromptTemplateList,
  mapPromptTemplateToApi,
} from '../mappers/adminMapper';
import {
  listPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  activatePromptTemplate,
  deletePromptTemplate,
  getAdminCostStats,
} from '../services/admin/adminService';
import { addAiBudgetManager, getAiBudgetNotificationDeliveries, getGlobalAiBudgetManagers, getGlobalAiBudgetOverview, removeAiBudgetManager, resumeAiBudget, sendAiBudgetTestNotification, updateGlobalAiBudgetSetting } from '../services/aiBudget/globalAiBudgetAdminService';

function parsePromptId(req: Parameters<typeof getRouteParam>[0]): number {
  const id = getRouteParam(req, 'id');
  if (!id || isNaN(Number(id))) {
    throw new AppError('無効なIDが指定されました', 400);
  }
  return Number(id);
}

export const getPrompts = asyncHandler(async (_req, res) => {
  const prompts = await listPromptTemplates(requireTenantContext());
  sendSuccess(res, mapPromptTemplateList(prompts));
});

export const createPrompt = asyncHandler(async (req, res) => {
  const newPrompt = await createPromptTemplate(requireTenantContext(), req.body);
  sendSuccess(res, mapPromptTemplateToApi(newPrompt));
});

export const updatePrompt = asyncHandler(async (req, res) => {
  const updated = await updatePromptTemplate(
    requireTenantContext(),
    parsePromptId(req),
    req.body
  );
  sendSuccess(res, mapPromptTemplateToApi(updated));
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
  sendSuccess(res, mapAdminCostStatsToApi(result));
});

/** Issue #124: 世帯単位ではない全体AI予算。専用ミドルウェアで保護される。 */
export const getGlobalAiBudget = asyncHandler(async (_req, res) => {
  sendSuccess(res, await getGlobalAiBudgetOverview());
});

export const updateGlobalAiBudget = asyncHandler(async (req, res) => {
  const memberId = req.user?.id;
  if (!memberId) throw new AppError('認証情報が見つかりません。', 401);
  sendSuccess(res, await updateGlobalAiBudgetSetting(memberId, req.body));
});
export const testGlobalAiBudgetNotification = asyncHandler(async (req, res) => {
  await sendAiBudgetTestNotification(req.body.channels);
  sendMessage(res, '試験通知を受け付けました。');
});
export const listGlobalAiBudgetNotificationDeliveries = asyncHandler(async (_req, res) => sendSuccess(res, await getAiBudgetNotificationDeliveries()));

export const resumeGlobalAiBudget = asyncHandler(async (req, res) => {
  if (!req.user?.id) throw new AppError('認証情報が見つかりません。', 401);
  sendSuccess(res, await resumeAiBudget(req.user.id, req.body.reason));
});

export const listGlobalAiBudgetManagers = asyncHandler(async (_req, res) => sendSuccess(res, await getGlobalAiBudgetManagers()));
export const addGlobalAiBudgetManager = asyncHandler(async (req, res) => {
  if (!req.user?.id) throw new AppError('認証情報が見つかりません。', 401);
  sendSuccess(res, await addAiBudgetManager(req.user.id, req.body.memberId, req.body.reason));
});
export const removeGlobalAiBudgetManager = asyncHandler(async (req, res) => {
  if (!req.user?.id) throw new AppError('認証情報が見つかりません。', 401);
  await removeAiBudgetManager(req.user.id, Number(req.params.memberId), req.body.reason);
  sendMessage(res, '全体AI予算管理者を削除しました。');
});
