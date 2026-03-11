import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { saveReceiptData } from '../services/persistenceService';

const prisma = new PrismaClient();

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
 * 重複チェック、カテゴリ学習、DB保存のロジックは persistenceService に集約されました。
 */
export const createReceipt = async (req: Request, res: Response) => {
  try {
    const { memberId, date, storeName, totalAmount, items, imagePath, rawText } = req.body;

    // 共通サービスを呼び出して保存（内部で重複チェックとカテゴリ推論を実行）
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
    // 409 (Conflict) などのステータスコードを透過的に扱う
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