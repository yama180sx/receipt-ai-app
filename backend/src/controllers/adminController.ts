import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { AppError } from '../utils/appError';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import {
  listPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  activatePromptTemplate,
  deletePromptTemplate,
  getAdminCostStats,
} from '../services/admin/adminService';

export const getPrompts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const prompts = await listPromptTemplates(requireTenantContext());
    res.json({ success: true, data: prompts });
  } catch (error) {
    logger.error(`[AdminAPI] getPrompts Error: ${error}`);
    next(new AppError('プロンプトの取得に失敗しました', 500));
  }
};

export const createPrompt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newPrompt = await createPromptTemplate(requireTenantContext(), req.body);
    res.json({ success: true, data: newPrompt });
  } catch (error) {
    logger.error(`[AdminAPI] createPrompt Error: ${error}`);
    next(error instanceof AppError ? error : new AppError('プロンプトの作成に失敗しました', 500));
  }
};

export const updatePrompt = async (req: Request, res: Response, next: NextFunction) => {
  const id = getRouteParam(req, 'id');
  if (!id || isNaN(Number(id))) {
    return next(new AppError('無効なIDが指定されました', 400));
  }

  try {
    const updated = await updatePromptTemplate(requireTenantContext(), Number(id), req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error(`[AdminAPI] updatePrompt Error: ${error}`);
    next(error instanceof AppError ? error : new AppError('プロンプトの更新に失敗しました', 500));
  }
};

export const activatePrompt = async (req: Request, res: Response, next: NextFunction) => {
  const id = getRouteParam(req, 'id');
  if (!id || isNaN(Number(id))) {
    return next(new AppError('無効なIDが指定されました', 400));
  }

  try {
    await activatePromptTemplate(requireTenantContext(), Number(id));
    res.json({ success: true, message: 'デフォルトを切り替えました' });
  } catch (error) {
    logger.error(`[AdminAPI] activatePrompt Error: ${error}`);
    next(error instanceof AppError ? error : new AppError('切り替えに失敗しました', 500));
  }
};

export const deletePrompt = async (req: Request, res: Response, next: NextFunction) => {
  const id = getRouteParam(req, 'id');
  if (!id || isNaN(Number(id))) {
    return next(new AppError('無効なIDが指定されました', 400));
  }

  try {
    await deletePromptTemplate(requireTenantContext(), Number(id));
    res.json({ success: true, message: '削除しました' });
  } catch (error) {
    logger.error(`[AdminAPI] deletePrompt Error: ${error}`);
    next(error instanceof AppError ? error : new AppError('削除に失敗しました', 500));
  }
};

export const getCostStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getAdminCostStats(requireTenantContext());
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[AdminAPI] getCostStats Error: ${error}`);
    next(new AppError('統計データの取得に失敗しました', 500));
  }
};
