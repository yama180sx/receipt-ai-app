import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import logger from '../utils/logger';

// --- [Issue #73] AI Cost Constants ---
// Gemini 2.0 Flash の単価設定 (100万トークンあたり)
const RATE_USD_TO_JPY = 150; // 為替レート（仮）
const PRICE_USD_PER_INPUT = 0.075 / 1000000;
const PRICE_USD_PER_OUTPUT = 0.30 / 1000000;

/**
 * プロンプトテンプレート一覧の取得
 */
export const getPrompts = async (req: Request, res: Response) => {
  try {
    const prompts = await prisma.promptTemplate.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ success: true, data: prompts });
  } catch (error) {
    logger.error(`[AdminAPI] getPrompts Error: ${error}`);
    res.status(500).json({ 
      success: false, 
      message: 'プロンプトの取得に失敗しました',
      error: 'プロンプトの取得に失敗しました'
    });
  }
};

/**
 * プロンプトテンプレートの更新
 */
export const updatePrompt = async (req: Request, res: Response) => {
  // ★修正: リクエストボディ(body)からの取得を優先し、互換性のために params からもフォールバック可能にする
  const key = (req.body.key || req.params.key) as string;
  const { systemPrompt, domainHints, isActive } = req.body;

  if (!key) {
    return res.status(400).json({ 
      success: false, 
      message: '識別キー(key)が指定されていません',
      error: '識別キー(key)が指定されていません' // フロントの err.response.data.error で表示させるため追加
    });
  }

  try {
    const updated = await prisma.promptTemplate.update({
      where: { key },
      data: {
        systemPrompt,
        domainHints,
        isActive,
        version: { increment: 1 }
      }
    });
    
    logger.info(`[AdminAPI] Prompt updated: ${key} (v${updated.version})`);
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error(`[AdminAPI] updatePrompt Error: ${error}`);
    res.status(500).json({ 
      success: false, 
      message: 'プロンプトの更新に失敗しました',
      error: 'プロンプトの更新に失敗しました'
    });
  }
};

/**
 * [Issue #73] AIコスト統計の取得（月別・モデル別）
 */
export const getCostStats = async (req: Request, res: Response) => {
  try {
    // PostgreSQLの TO_CHAR 関数を使用して月別・モデル別に集計
    const stats: any[] = await prisma.$queryRaw`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM') AS month,
        "modelId",
        SUM("promptTokens")::int AS "totalPromptTokens",
        SUM("candidatesTokens")::int AS "totalCandidatesTokens"
      FROM "ApiUsageLog"
      GROUP BY month, "modelId"
      ORDER BY month DESC;
    `;

    // 取得した集計データに対して概算料金(円)を計算して付与
    const result = stats.map(row => {
      const costUsd = (row.totalPromptTokens * PRICE_USD_PER_INPUT) + (row.totalCandidatesTokens * PRICE_USD_PER_OUTPUT);
      const costJpy = costUsd * RATE_USD_TO_JPY;
      
      return {
        month: row.month,
        modelId: row.modelId,
        totalPromptTokens: row.totalPromptTokens,
        totalCandidatesTokens: row.totalCandidatesTokens,
        estimatedCostJpy: Math.round(costJpy * 100) / 100 // 小数第2位で丸め
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[AdminAPI] getCostStats Error: ${error}`);
    res.status(500).json({ 
      success: false, 
      message: '統計データの取得に失敗しました',
      error: '統計データの取得に失敗しました'
    });
  }
};