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