import fs from 'node:fs';
import path from 'node:path';
import prisma from '../../utils/prismaClient';
import logger from '../../utils/logger';
import { AppError } from '../../utils/appError';
import type { TenantContext } from '../../utils/context';

const RATE_USD_TO_JPY = 150;
const PRICE_USD_PER_INPUT = 0.075 / 1000000;
const PRICE_USD_PER_OUTPUT = 0.3 / 1000000;

const syncPromptsToJson = async (familyGroupId: number) => {
  try {
    const prompts = await prisma.promptTemplate.findMany({
      where: { familyGroupId },
      orderBy: { id: 'asc' },
    });
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
  return prisma.promptTemplate.findMany({
    where: { familyGroupId: ctx.familyGroupId },
    orderBy: [{ key: 'asc' }, { isActive: 'desc' }, { updatedAt: 'desc' }],
  });
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
    await prisma.promptTemplate.updateMany({
      where: { key, familyGroupId },
      data: { isActive: false },
    });
  }

  const newPrompt = await prisma.promptTemplate.create({
    data: {
      key,
      name,
      description,
      systemPrompt,
      domainHints,
      isActive,
      version: 1,
      familyGroupId,
    },
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
  const existing = await prisma.promptTemplate.findFirst({
    where: { id, familyGroupId: ctx.familyGroupId },
  });
  if (!existing) {
    throw new AppError('対象のプロンプトが見つかりません', 404);
  }

  const updated = await prisma.promptTemplate.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      domainHints: input.domainHints,
      version: { increment: 1 },
    },
  });

  await syncPromptsToJson(ctx.familyGroupId);
  return updated;
}

export async function activatePromptTemplate(ctx: TenantContext, id: number) {
  const target = await prisma.promptTemplate.findFirst({
    where: { id, familyGroupId: ctx.familyGroupId },
  });
  if (!target) {
    throw new AppError('対象のプロンプトが見つかりません', 404);
  }

  await prisma.$transaction([
    prisma.promptTemplate.updateMany({
      where: { key: target.key, familyGroupId: ctx.familyGroupId },
      data: { isActive: false },
    }),
    prisma.promptTemplate.update({
      where: { id: target.id },
      data: { isActive: true },
    }),
  ]);

  await syncPromptsToJson(ctx.familyGroupId);
}

export async function deletePromptTemplate(ctx: TenantContext, id: number) {
  const target = await prisma.promptTemplate.findFirst({
    where: { id, familyGroupId: ctx.familyGroupId },
  });
  if (!target) {
    throw new AppError('対象のプロンプトが見つかりません', 404);
  }
  if (target.isActive) {
    throw new AppError('使用中のプロンプトは削除できません', 400);
  }

  await prisma.promptTemplate.delete({ where: { id: target.id } });
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
  const stats = await prisma.$queryRaw<
    Array<{
      month: string;
      modelId: string;
      totalPromptTokens: number;
      totalCandidatesTokens: number;
    }>
  >`
    SELECT
      TO_CHAR(l."createdAt", 'YYYY-MM') AS month,
      l."modelId",
      SUM(l."promptTokens")::int AS "totalPromptTokens",
      SUM(l."candidatesTokens")::int AS "totalCandidatesTokens"
    FROM "ApiUsageLog" l
    INNER JOIN "FamilyMember" fm ON l."familyMemberId" = fm.id
    WHERE fm."familyGroupId" = ${ctx.familyGroupId}
    GROUP BY month, l."modelId"
    ORDER BY month DESC;
  `;

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
