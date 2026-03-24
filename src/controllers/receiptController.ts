import { Request, Response } from 'express';
import logger from '../utils/logger';
import { saveReceiptData } from '../services/persistenceService';
import { getCleanText } from '../utils/normalizer'; // 正規化関数をインポート
import { prisma } from '../utils/prismaClient';
import { Prisma } from '@prisma/client'; // 型定義だけは直接インポートが必要
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
 * 【Issue #24】レシート登録（共通保存サービスへの統合）
 */
export const createReceipt = async (req: Request, res: Response) => {
  try {
    const { memberId, date, storeName, totalAmount, items, imagePath, rawText } = req.body;

    const newReceipt = await saveReceiptData({
      memberId: Number(memberId),
      storeName,
      date: new Date(date),
      totalAmount: Number(totalAmount),
      imagePath: imagePath || "",
      rawText: rawText || "",
      items: items.map((item: any) => ({
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity ? Number(item.quantity) : 1,
        categoryId: item.categoryId ? Number(item.categoryId) : null,
      })),
    });

    logger.info(`[RECEIPT_CREATED] ID: ${newReceipt.id} を登録しました`);
    res.status(201).json(newReceipt);

  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    if (statusCode === 409) {
      logger.warn(`[CREATE_RECEIPT_BLOCK] 重複によりブロック: ${error.message}`);
      return res.status(409).json({
        code: 'DUPLICATE_RECEIPT',
        message: 'このレシートは既に登録されている可能性があります。'
      });
    }
    logger.error(`[CREATE_RECEIPT_ERROR] ${error.message}`);
    res.status(statusCode).json({ error: 'レシートの保存に失敗しました' });
  }
};

/**
 * 【Issue #20】アイテムのカテゴリーを更新し、学習マスタへ反映する
 */
export const updateItemCategory = async (req: Request, res: Response) => {
  const { id } = req.params; // Item ID
  const { categoryId } = req.body;

  try {
    // 1. トランザクションで「カテゴリー更新」と「学習マスタ登録」を同時に行う
    const result = await prisma.$transaction(async (tx) => {
      // 2. 現在のアイテムと親レシートの情報を取得（学習用）
      const currentItem = await tx.item.findUnique({
        where: { id: Number(id) },
        include: { receipt: true }
      });

      if (!currentItem) {
        throw new Error('ITEM_NOT_FOUND');
      }

      // 3. アイテムのカテゴリーを更新
      const updatedItem = await tx.item.update({
        where: { id: Number(id) },
        data: { categoryId: categoryId ? Number(categoryId) : null },
        include: { category: true }
      });

      // 4. 【学習】ProductMaster へ Upsert
      if (categoryId) {
        const cleanItemName = getCleanText(currentItem.name);
        const cleanStoreName = getCleanText(currentItem.receipt.storeName);

        await tx.productMaster.upsert({
          where: {
            name_storeName: {
              name: cleanItemName,
              storeName: cleanStoreName,
            }
          },
          update: { categoryId: Number(categoryId) },
          create: {
            name: cleanItemName,
            storeName: cleanStoreName,
            categoryId: Number(categoryId),
          }
        });
        logger.debug(`[LEARNING] 学習完了: "${cleanItemName}" @ ${cleanStoreName} -> Cat:${categoryId}`);
      }

      return updatedItem;
    });

    logger.info(`[ITEM_UPDATE] ID: ${id} のカテゴリーを ${result.category?.name || '未分類'} に更新（学習反映済）`);
    res.json(result);

  } catch (error: any) {
    logger.error(`[ITEM_UPDATE_ERROR] ${error.message}`);
    const status = error.message === 'ITEM_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ error: 'カテゴリーの更新または学習に失敗しました' });
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

/**
 * レシートを削除する（連動して物理ファイルも削除される）
 */
export const deleteReceipt = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const deleted = await prisma.receipt.delete({
      where: { id: Number(id) }
    });

    logger.info(`[RECEIPT_DELETED] ID: ${id} を削除しました`);
    res.json({ message: '削除に成功しました', deleted });
  } catch (error: any) {
    logger.error(`[DELETE_ERROR] ${error.message}`);
    res.status(500).json({ error: '削除に失敗しました' });
  }
};
