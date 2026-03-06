import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import logger from '../utils/logger';
// AI側と判定基準を統一するため、共通の正規化関数をインポート
import { getCleanText } from '../utils/normalizer'; 

const prisma = new PrismaClient();

/**
 * 🔍 デバッグモード・フラグ
 * 重複チェックの詳細をログに出したいときは true、不要なら false にしてください。
 */
const DEBUG_DUPLICATE = false; 

/**
 * カテゴリーマスタ一覧を取得
 */
export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    logger.error(`[GET_CATEGORIES_ERROR] ${error}`);
    res.status(500).json({ error: 'カテゴリー一覧の取得に失敗しました' });
  }
};

/**
 * 【Issue #22】レシート登録（APIルート / 重複チェック付き）
 */
export const createReceipt = async (req: Request, res: Response) => {
  const { memberId, date, storeName, totalAmount, items, imagePath, rawText } = req.body;

  if (DEBUG_DUPLICATE) {
    logger.debug(`[CONTROLLER:DUPE_CHECK] START - Member:${memberId}, Store:"${storeName}", Amount:${totalAmount}`);
  }

  try {
    // 1. 日付の範囲設定（その日の 00:00:00 〜 23:59:59）
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    if (DEBUG_DUPLICATE) {
      logger.debug(`[CONTROLLER:RANGE] ${startOfDay.toISOString()} ～ ${endOfDay.toISOString()}`);
    }

    // 2. 重複の先行照会（インデックスの効く金額と日付で絞り込む）
    const potentialDuplicates = await prisma.receipt.findMany({
      where: {
        memberId: Number(memberId),
        totalAmount: Number(totalAmount),
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (DEBUG_DUPLICATE) {
      logger.debug(`[CONTROLLER:DB_HITS] 候補数: ${potentialDuplicates.length}`);
    }

    // 3. 店舗名の正規化比較による最終判定（AI側と共通の getCleanText を使用）
    const normalizedNew = getCleanText(storeName || '');
    let duplicateRecord = null;

    for (const r of potentialDuplicates) {
      const normalizedExisting = getCleanText(r.storeName);
      
      if (DEBUG_DUPLICATE) {
        logger.debug(`[CONTROLLER:COMPARE] New:"${normalizedNew}" vs Existing:"${normalizedExisting}"`);
      }

      if (normalizedExisting === normalizedNew) {
        duplicateRecord = r;
        break;
      }
    }

    if (duplicateRecord) {
      logger.warn(`[CONTROLLER:BLOCK] 重複を検知しました: ID ${duplicateRecord.id}`);
      return res.status(409).json({
        code: 'DUPLICATE_RECEIPT',
        message: 'このレシートは既に登録されている可能性があります。',
        existingReceipt: duplicateRecord
      });
    }

    // 4. 保存処理
    const newReceipt = await prisma.receipt.create({
      data: {
        memberId: Number(memberId),
        date: new Date(date),
        storeName,
        totalAmount: Number(totalAmount),
        imagePath,
        rawText,
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            price: Number(item.price),
            quantity: item.quantity || 1,
            categoryId: item.categoryId ? Number(item.categoryId) : null,
          })),
        },
      },
      include: { items: true }
    });

    logger.info(`[RECEIPT_CREATED] ID: ${newReceipt.id} を登録しました`);
    res.status(201).json(newReceipt);

  } catch (error: any) {
    logger.error(`[CREATE_RECEIPT_ERROR] ${error.message}`);
    res.status(500).json({ error: 'レシートの保存に失敗しました' });
  }
};

/**
 * アイテムのカテゴリーを個別に更新する
 */
export const updateItemCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { categoryId } = req.body;

  try {
    const updatedItem = await prisma.item.update({
      where: { id: Number(id) },
      data: { 
        categoryId: categoryId ? Number(categoryId) : null 
      },
      include: { 
        category: true 
      }
    });

    logger.info(`[ITEM_UPDATE] ID: ${id} のカテゴリーを ${updatedItem.category?.name || '未分類'} に更新しました`);
    res.json(updatedItem);
  } catch (error: any) {
    logger.error(`[ITEM_UPDATE_ERROR] ${error.message}`);
    res.status(500).json({ error: 'カテゴリーの更新に失敗しました' });
  }
};

/**
 * レシート一覧を取得
 */
export const getReceipts = async (req: Request, res: Response) => {
  try {
    const { memberId, month } = req.query;
    const where: Prisma.ReceiptWhereInput = {};

    if (typeof memberId === 'string' && memberId.trim() !== '') {
      where.memberId = Number(memberId);
    }

    if (typeof month === 'string' && month.trim() !== '') {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      where.date = { gte: start, lt: end };
    }

    const receipts = await prisma.receipt.findMany({
      where,
      select: {
        id: true,
        memberId: true,
        storeName: true,
        date: true,
        totalAmount: true,
        imagePath: true,
        items: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            categoryId: true,
            category: {
              select: { id: true, name: true, color: true }
            }
          }
        }
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    res.json(receipts);
  } catch (error: any) {
    logger.error(`[GET_RECEIPTS_ERROR] ${error.message}`);
    res.status(500).json({ error: 'レシート一覧の取得に失敗しました' });
  }
};