import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { prisma } from '../utils/prismaClient'; 
import { AppError } from '../utils/appError';
import { getCleanText } from '../utils/normalizer';
import { receiptQueue } from '../queues/receiptQueue';
import { saveParsedReceipt, saveConfirmedReceipt } from '../services/receiptService'; 
import { getFamilyGroupId, getMemberId } from '../utils/context';

/**
 * [Issue #43] ジョブステータス取得
 * Workerが解析結果（parsedData, imagePath, validation）を返すようになったため、
 * job.returnvalue をそのままフロントエンドへ返却します。
 */
export const getJobStatus = async (req: Request<{ jobId: string }>, res: Response, next: NextFunction) => {
  try {
    const job = await receiptQueue.getJob(req.params.jobId!);
    if (!job) throw new AppError('ジョブが見つかりません。', 404);

    const state = await job.getState();
    res.status(200).json({
      success: true,
      data: {
        id: job.id,
        state,
        result: job.returnvalue, // analyzeOnly の戻り値（解析データ）が含まれる
        error: job.failedReason
      }
    });
  } catch (error) { next(error); }
};

/**
 * [Issue #45] カテゴリ一覧取得
 */
export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
};

/**
 * [Issue #43 & #45] レシートアップロード (AI解析)
 */
export const uploadReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = req.headers['x-member-id'];
    const imagePath = req.file?.path;

    if (!imagePath) throw new AppError('画像がアップロードされていません。', 400);
    if (!memberId) throw new AppError('メンバーIDが指定されていません。', 400);

    const job = await receiptQueue.add('analyze-receipt', {
      memberId: Number(memberId),
      familyGroupId: getFamilyGroupId(),
      imagePath,
    });

    res.status(202).json({ success: true, data: { jobId: job.id } });
  } catch (error) { next(error); }
};

/**
 * [Issue #49-8] 解析結果の確定保存
 * フロントエンドでの編集内容を受け取り、DBへ本保存します。
 */
export const commitReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = getMemberId();
    const familyGroupId = getFamilyGroupId();
    const { parsedData, imagePath, validation } = req.body;

    if (!parsedData || !imagePath) {
      throw new AppError('必要なデータが不足しています。', 400);
    }

    if (!memberId || !familyGroupId) {
      throw new AppError('認証情報または世帯情報が取得できません。', 401);
    }

    const result = await saveConfirmedReceipt(
      memberId,
      familyGroupId,
      parsedData,
      imagePath,
      validation?.isSuspicious || false,
      validation?.warnings || []
    );

    res.status(201).json({ success: true, data: result });
  } catch (error: any) { 
    if (error.statusCode === 409) return res.status(409).json({ success: false, message: 'DUPLICATE' });
    next(error); 
  }
};

/**
 * 手動登録 (receiptService に一本化)
 */
export const createReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = req.body.memberId || req.headers['x-member-id'];
    const familyGroupId = getFamilyGroupId();
    const { date, storeName, totalAmount, items, imagePath } = req.body;

    const newReceipt = await saveParsedReceipt(
      Number(memberId),
      familyGroupId,
      {
        storeName,
        purchaseDate: date,
        totalAmount: Number(totalAmount),
        items: items.map((i: any) => ({
          name: i.name,
          price: Number(i.price),
          quantity: Number(i.quantity || 1)
        }))
      },
      imagePath || "",
      false, 
      []
    );

    res.status(201).json({ success: true, data: newReceipt });
  } catch (error: any) { 
    if (error.statusCode === 409) return res.status(409).json({ success: false, message: 'DUPLICATE' });
    next(error); 
  }
};

/**
 * 明細カテゴリ更新 ＋ 世帯別学習
 */
export const updateItemCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { categoryId } = req.body;
  const familyGroupId = getFamilyGroupId();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentItem = await tx.item.findUnique({
        where: { id: Number(id) },
        include: { receipt: true }
      });

      if (!currentItem) throw new AppError('ItemNotFound', 404);

      const updatedItem = await tx.item.update({
        where: { id: Number(id) },
        data: { categoryId: categoryId ? Number(categoryId) : null },
        include: { category: true }
      });

      if (categoryId) {
        await (tx.productMaster as any).upsert({
          where: {
            name_storeName_familyGroupId: {
              name: getCleanText(currentItem.name),
              storeName: getCleanText(currentItem.receipt.storeName),
              familyGroupId
            }
          },
          update: { categoryId: Number(categoryId) },
          create: {
            name: getCleanText(currentItem.name),
            storeName: getCleanText(currentItem.receipt.storeName),
            categoryId: Number(categoryId),
            familyGroupId
          }
        });
      }
      return updatedItem;
    });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

/**
 * [Issue #45] レシート一覧取得 (世帯フィルタリング)
 */
export const getReceipts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = req.query.memberId || req.headers['x-member-id'];
    const { month } = req.query;
    const familyGroupId = getFamilyGroupId();
    
    const where: any = { familyGroupId };
    if (memberId) where.memberId = Number(memberId);
    
    if (typeof month === 'string' && month) {
      const start = new Date(`${month}-01`);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      where.date = { gte: start, lt: end };
    }

    const receipts = await prisma.receipt.findMany({
      where,
      include: { items: { include: { category: true } } },
      orderBy: { date: 'desc' }
    });
    res.json({ success: true, data: receipts });
  } catch (error) { next(error); }
};

/**
 * 最新1件の取得
 */
export const getLatestReceipt = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const receipt = await prisma.receipt.findFirst({
      where: { familyGroupId: getFamilyGroupId() },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { category: true } } }
    });
    res.json({ success: true, data: receipt });
  } catch (error) { next(error); }
};

/**
 * 削除
 */
export const deleteReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.receipt.delete({ 
      where: { id: Number(req.params.id) } 
    });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) { next(error); }
};

/**
 * [Issue #50] 月別統計
 */
export const getMonthlyStats = async (req: Request, res: Response, next: NextFunction) => {
  const familyGroupId = getFamilyGroupId();
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

  try {
    const totalRes = await prisma.$queryRaw<any[]>`
      SELECT SUM("totalAmount")::int as total
      FROM "Receipt"
      WHERE "familyGroupId" = ${familyGroupId}
      AND TO_CHAR(date, 'YYYY-MM') = ${month}
    `;
    const totalAmount = totalRes[0]?.total || 0;

    const categoryStats = await prisma.$queryRaw<any[]>`
      SELECT 
        c.id as "categoryId",
        c.name as "categoryName",
        c.color as "color",
        SUM(i.price * i.quantity)::int as "totalAmount"
      FROM "Item" i
      JOIN "Receipt" r ON i."receiptId" = r.id
      LEFT JOIN "Category" c ON i."categoryId" = c.id
      WHERE r."familyGroupId" = ${familyGroupId}
      AND TO_CHAR(r.date, 'YYYY-MM') = ${month}
      GROUP BY c.id, c.name, c.color
      ORDER BY "totalAmount" DESC
    `;

    const latestReceipt = await prisma.receipt.findFirst({
      where: { 
        familyGroupId, 
        date: { 
          gte: new Date(`${month}-01`), 
          lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)) 
        } 
      },
      orderBy: { date: 'desc' },
      include: { items: { include: { category: true } } }
    });

    res.json({ 
      success: true, 
      data: {
        month,
        totalAmount,
        stats: categoryStats.map(s => ({
          ...s,
          categoryName: s.categoryName || '未分類'
        })),
        latestReceipt
      }
    });
  } catch (error) { next(error); }
};

/**
 * [Issue #50] 高度な統計
 */
export const getAdvancedStats = async (_req: Request, res: Response, next: NextFunction) => {
  const fId = getFamilyGroupId();
  try {
    const trend = await prisma.$queryRaw<any[]>`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as period, 
        SUM("totalAmount")::int as total 
      FROM "Receipt" 
      WHERE "familyGroupId" = ${fId} 
      GROUP BY period 
      ORDER BY period DESC 
      LIMIT 6
    `;

    const month = new Date().toISOString().slice(0, 7);
    const paretoRaw = await prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(c.name, '未分類') as name,
        SUM(i.price * i.quantity)::int as amount
      FROM "Item" i
      JOIN "Receipt" r ON i."receiptId" = r.id
      LEFT JOIN "Category" c ON i."categoryId" = c.id
      WHERE r."familyGroupId" = ${fId}
      AND TO_CHAR(r.date, 'YYYY-MM') = ${month}
      GROUP BY c.name
      ORDER BY amount DESC
    `;

    const total = paretoRaw.reduce((sum, item) => sum + (item.amount || 0), 0);
    let cumulative = 0;
    const pareto = paretoRaw.map(item => {
      const ratio = total > 0 ? Math.round((item.amount / total) * 100) : 0;
      cumulative += ratio;
      return {
        ...item,
        ratio,
        cumulative_ratio: cumulative > 100 ? 100 : cumulative
      };
    });

    res.json({ success: true, data: { trend, pareto } });
  } catch (error) { next(error); }
};