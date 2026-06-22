import fs from 'node:fs';
import path from 'node:path';
import logger from '../../utils/logger';
import { AppError } from '../../utils/appError';
import type { TenantContext } from '../../utils/context';
import {
  activatePromptTemplateInTransaction,
  createPromptTemplateRecord,
  deactivatePromptTemplatesByKey,
  deletePromptTemplateById,
  findAllPromptTemplatesForSync,
  findPromptTemplateById,
  findPromptTemplatesByFamilyGroup,
  updatePromptTemplateRecord,
} from '../../repositories/promptRepository';
import { queryAdminCostStatsByFamilyGroup } from '../../repositories/apiUsageLogRepository';

const RATE_USD_TO_JPY = 150;
const PRICE_USD_PER_INPUT = 0.075 / 1000000;
const PRICE_USD_PER_OUTPUT = 0.3 / 1000000;

const syncPromptsToJson = async (familyGroupId: number) => {
  try {
    const prompts = await findAllPromptTemplatesForSync(familyGroupId);
    const seedsDir = path.join(__dirname, '../../../prisma/seeds');
    const filePath = path.join(seedsDir, 'prompt_templates.json');

    if (!fs.existsSync(seedsDir)) {
      fs.mkdirSync(seedsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(prompts, null, 2), 'utf-8');
    logger.info(`[AdminAPI] Synced prompts to JSON: ${filePath}`);
  } catch (error) {
    logger.error(`[AdminAPI] syncPromptsToJson Error: ${error}`);
  }
};

export async function listPromptTemplates(ctx: TenantContext) {
  return findPromptTemplatesByFamilyGroup(ctx.familyGroupId);
}

export async function createPromptTemplate(
  ctx: TenantContext,
  input: {
    key: string;
    name?: string;
    description?: string;
    systemPrompt: string;
    domainHints?: unknown;
    isActive?: boolean;
  }
) {
  const { key, name, description, systemPrompt, domainHints, isActive } = input;
  if (!key || !systemPrompt) {
    throw new AppError('必須項目が不足しています', 400);
  }

  const { familyGroupId } = ctx;

  if (isActive) {
    await deactivatePromptTemplatesByKey(familyGroupId, key);
  }

  const newPrompt = await createPromptTemplateRecord({
    key,
    name,
    description,
    systemPrompt,
    domainHints,
    isActive,
    version: 1,
    familyGroupId,
  });

  await syncPromptsToJson(familyGroupId);
  return newPrompt;
}

export async function updatePromptTemplate(
  ctx: TenantContext,
  id: number,
  input: {
    name?: string;
    description?: string;
    systemPrompt?: string;
    domainHints?: unknown;
  }
) {
  const existing = await findPromptTemplateById(ctx.familyGroupId, id);
  if (!existing) {
    throw new AppError('対象のプロンプトが見つかりません', 404);
  }

  const updated = await updatePromptTemplateRecord(existing.id, {
    name: input.name,
    description: input.description,
    systemPrompt: input.systemPrompt,
    domainHints: input.domainHints,
    version: { increment: 1 },
  });

  await syncPromptsToJson(ctx.familyGroupId);
  return updated;
}

export async function activatePromptTemplate(ctx: TenantContext, id: number) {
  const target = await findPromptTemplateById(ctx.familyGroupId, id);
  if (!target) {
    throw new AppError('対象のプロンプトが見つかりません', 404);
  }

  await activatePromptTemplateInTransaction(ctx.familyGroupId, target.id, target.key);
  await syncPromptsToJson(ctx.familyGroupId);
}

export async function deletePromptTemplate(ctx: TenantContext, id: number) {
  const target = await findPromptTemplateById(ctx.familyGroupId, id);
  if (!target) {
    throw new AppError('対象のプロンプトが見つかりません', 404);
  }
  if (target.isActive) {
    throw new AppError('使用中のプロンプトは削除できません', 400);
  }

  await deletePromptTemplateById(target.id);
  await syncPromptsToJson(ctx.familyGroupId);
}

type CostStatRow = {
  month: string;
  modelId: string;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  estimatedCostJpy: number;
};

export async function getAdminCostStats(ctx: TenantContext): Promise<CostStatRow[]> {
  const stats = await queryAdminCostStatsByFamilyGroup(ctx.familyGroupId);

  return stats.map((row) => {
    const costUsd =
      row.totalPromptTokens * PRICE_USD_PER_INPUT +
      row.totalCandidatesTokens * PRICE_USD_PER_OUTPUT;
    const costJpy = costUsd * RATE_USD_TO_JPY;

    return {
      month: row.month,
      modelId: row.modelId,
      totalPromptTokens: row.totalPromptTokens,
      totalCandidatesTokens: row.totalCandidatesTokens,
      estimatedCostJpy: Math.round(costJpy * 100) / 100,
    };
  });
}
