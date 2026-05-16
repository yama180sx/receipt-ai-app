import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';
import logger from '../utils/logger';

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
    res.status(500).json({ success: false, message: 'プロンプトの取得に失敗しました' });
  }
};

/**
 * プロンプトテンプレートの更新
 */
export const updatePrompt = async (req: Request, res: Response) => {
  // 型アサーションにより key が string であることを明示
  const { key } = req.params as { key: string };
  const { systemPrompt, domainHints, isActive } = req.body;

  if (!key) {
    return res.status(400).json({ success: false, message: '識別キー(key)が指定されていません' });
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
    res.status(500).json({ success: false, message: 'プロンプトの更新に失敗しました' });
  }
};