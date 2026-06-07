import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import logger from '../utils/logger';
import fs from 'node:fs';
import path from 'node:path';
import { getFamilyGroupId } from '../utils/context';

// --- [Issue #73] AI Cost Constants ---
const RATE_USD_TO_JPY = 150; 
const PRICE_USD_PER_INPUT = 0.075 / 1000000;
const PRICE_USD_PER_OUTPUT = 0.30 / 1000000;

/**
 * プロンプトの変更をJSONファイルにダンプ（同期）するヘルパー関数
 */
const syncPromptsToJson = async (familyGroupId: number) => {
  try {
    const prompts = await prisma.promptTemplate.findMany({
      where: { familyGroupId },
      orderBy: { id: 'asc' },
    });
    const seedsDir = path.join(__dirname, '../../prisma/seeds');
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

/**
 * プロンプトテンプレート一覧の取得
 */
export const getPrompts = async (req: Request, res: Response) => {
  try {
    const prompts = await prisma.promptTemplate.findMany({
      orderBy: [
        { key: 'asc' },
        { isActive: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
    res.json({ success: true, data: prompts });
  } catch (error) {
    logger.error(`[AdminAPI] getPrompts Error: ${error}`);
    res.status(500).json({ success: false, error: 'プロンプトの取得に失敗しました' });
  }
};

/**
 * プロンプトテンプレートの新規作成
 */
export const createPrompt = async (req: Request, res: Response) => {
  const { key, name, description, systemPrompt, domainHints, isActive } = req.body;
  
  if (!key || !systemPrompt) {
    return res.status(400).json({ success: false, error: '必須項目が不足しています' });
  }

  try {
    const familyGroupId = getFamilyGroupId();
    if (isActive) {
      await prisma.promptTemplate.updateMany({
        where: { key, familyGroupId },
        data: { isActive: false },
      });
    }

    const newPrompt = await prisma.promptTemplate.create({
      data: { key, name, description, systemPrompt, domainHints, isActive, version: 1 },
    });

    await syncPromptsToJson(familyGroupId);
    res.json({ success: true, data: newPrompt });
  } catch (error) {
    logger.error(`[AdminAPI] createPrompt Error: ${error}`);
    res.status(500).json({ success: false, error: 'プロンプトの作成に失敗しました' });
  }
};

/**
 * プロンプトテンプレートの更新
 */
export const updatePrompt = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, systemPrompt, domainHints } = req.body;

  // ★ 追加: IDが正しく数値として渡ってきているかのバリデーション
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ success: false, error: '無効なIDが指定されました' });
  }

  try {
    const familyGroupId = getFamilyGroupId();
    const updated = await prisma.promptTemplate.update({
      where: { id: Number(id) },
      data: { 
        name, 
        description, 
        systemPrompt, 
        domainHints,
        version: { increment: 1 } 
      }
    });
    
    await syncPromptsToJson(familyGroupId);
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error(`[AdminAPI] updatePrompt Error: ${error}`);
    res.status(500).json({ success: false, error: 'プロンプトの更新に失敗しました' });
  }
};

/**
 * プロンプトテンプレートのデフォルト（使用中）切り替え
 */
export const activatePrompt = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // バリデーション
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ success: false, error: '無効なIDが指定されました' });
  }

  try {
    const familyGroupId = getFamilyGroupId();
    const target = await prisma.promptTemplate.findUnique({ where: { id: Number(id) } });
    if (!target) {
      return res.status(404).json({ success: false, error: '対象のプロンプトが見つかりません' });
    }

    await prisma.$transaction([
      prisma.promptTemplate.updateMany({
        where: { key: target.key, familyGroupId },
        data: { isActive: false },
      }),
      prisma.promptTemplate.update({
        where: { id: Number(id) },
        data: { isActive: true },
      }),
    ]);

    await syncPromptsToJson(familyGroupId);
    res.json({ success: true, message: 'デフォルトを切り替えました' });
  } catch (error) {
    logger.error(`[AdminAPI] activatePrompt Error: ${error}`);
    res.status(500).json({ success: false, error: '切り替えに失敗しました' });
  }
};

/**
 * プロンプトテンプレートの削除
 */
export const deletePrompt = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // バリデーション
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ success: false, error: '無効なIDが指定されました' });
  }

  try {
    const familyGroupId = getFamilyGroupId();
    const target = await prisma.promptTemplate.findUnique({ where: { id: Number(id) } });
    if (target?.isActive) {
      return res.status(400).json({ success: false, error: '使用中のプロンプトは削除できません' });
    }

    await prisma.promptTemplate.delete({ where: { id: Number(id) } });
    await syncPromptsToJson(familyGroupId);
    res.json({ success: true, message: '削除しました' });
  } catch (error) {
    logger.error(`[AdminAPI] deletePrompt Error: ${error}`);
    res.status(500).json({ success: false, error: '削除に失敗しました' });
  }
};

/**
 * [Issue #73] AIコスト統計の取得（月別・モデル別）
 */
export const getCostStats = async (req: Request, res: Response) => {
  try {
    const familyGroupId = getFamilyGroupId();
    const stats: any[] = await prisma.$queryRaw`
      SELECT
        TO_CHAR(l."createdAt", 'YYYY-MM') AS month,
        l."modelId",
        SUM(l."promptTokens")::int AS "totalPromptTokens",
        SUM(l."candidatesTokens")::int AS "totalCandidatesTokens"
      FROM "ApiUsageLog" l
      INNER JOIN "FamilyMember" fm ON l."familyMemberId" = fm.id
      WHERE fm."familyGroupId" = ${familyGroupId}
      GROUP BY month, l."modelId"
      ORDER BY month DESC;
    `;

    const result = stats.map(row => {
      const costUsd = (row.totalPromptTokens * PRICE_USD_PER_INPUT) + (row.totalCandidatesTokens * PRICE_USD_PER_OUTPUT);
      const costJpy = costUsd * RATE_USD_TO_JPY;
      
      return {
        month: row.month,
        modelId: row.modelId,
        totalPromptTokens: row.totalPromptTokens,
        totalCandidatesTokens: row.totalCandidatesTokens,
        estimatedCostJpy: Math.round(costJpy * 100) / 100
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[AdminAPI] getCostStats Error: ${error}`);
    res.status(500).json({ success: false, error: '統計データの取得に失敗しました' });
  }
};