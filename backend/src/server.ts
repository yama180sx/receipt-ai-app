import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import sharp from 'sharp'; 
import { processAndSaveReceipt } from './services/receiptService';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';
import receiptRoutes from './routes/receiptRoutes';
import { getCleanText } from './utils/normalizer';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0'; 
const prisma = new PrismaClient();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 既存のレシート関連ルート
app.use('/api', receiptRoutes);

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * 📂 カテゴリー管理 API
 */
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
    res.json(categories);
  } catch (error: any) {
    logger.error(`[APIエラー] カテゴリー取得失敗: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const newCategory = await prisma.category.create({ data: { name, color: color || '#2ecc71' } });
    logger.info(`[API] カテゴリー追加成功: ${name}`);
    res.status(201).json(newCategory);
  } catch (error: any) {
    logger.error(`[APIエラー] カテゴリー追加失敗: ${error.message}`);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.category.delete({ where: { id: Number(id) } });
    logger.info(`[API] カテゴリー削除成功: ID ${id}`);
    res.status(204).send();
  } catch (error: any) {
    logger.warn(`[API制限] カテゴリー削除失敗（使用中の可能性あり）: ID ${id}`);
    res.status(400).json({ error: 'Cannot delete category in use' });
  }
});

/**
 * 📂 レシートアップロード & 解析 (Issue #30 ストレージ最適化)
 */
app.post('/api/receipts/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '画像がアップロードされていません。' });

    const memberId = parseInt(req.body.memberId as string) || 1;
    
    // --- Issue #30: 保存形式を WebP に変更 ---
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const baseFileName = `receipt-${timestamp}-${randomSuffix}`;
    const imagePath = path.join(uploadDir, `${baseFileName}.webp`);

    await sharp(req.file.buffer, { failOnError: false })
      .rotate() 
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }) 
      .webp({ quality: 75, effort: 6 }) 
      .toFile(imagePath);

    logger.info(`[Issue #30] WebP最適化完了: ${imagePath}`);

    const result = await processAndSaveReceipt(memberId, imagePath);

    res.status(200).json({
      message: '解析および保存が完了しました。',
      data: {
        ...result,
        items: result.items.map(i => ({
          ...i,
          category: i.category ? { id: i.category.id, name: i.category.name, color: (i.category as any).color } : null
        }))
      }
    });
    
  } catch (error: any) {
    if (error.message === 'DUPLICATE_RECEIPT_DETECTED') {
      return res.status(409).json({ error: 'このレシートは既に登録されています。', code: 'DUPLICATE_RECEIPT' });
    }
    logger.error(`[APIエラー] ${error.message}`);
    res.status(500).json({ error: 'サーバー内部エラーが発生しました。' });
  }
});

/**
 * 📂 統計 API (Issue #31: 月別選択 & 期間比較対応)
 */
app.get('/api/stats/monthly', async (req, res) => {
  const { month, memberId } = req.query; 
  try {
    // 1. 対象月（targetDate）の設定
    const targetDate = month ? new Date(`${month as string}-01T00:00:00Z`) : new Date();
    
    // 2. 当月および前月の期間計算
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
    
    const startOfPrevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0, 23, 59, 59);

    const mId = Number(memberId || 1);

    // 3. 当月のカテゴリ別集計
    const stats = await prisma.item.groupBy({
      by: ['categoryId'],
      where: { receipt: { memberId: mId, date: { gte: startOfMonth, lte: endOfMonth } } },
      _sum: { price: true },
    });

    // 4. 前月の総計（比較用）
    const prevMonthTotal = await prisma.item.aggregate({
      where: { receipt: { memberId: mId, date: { gte: startOfPrevMonth, lte: endOfPrevMonth } } },
      _sum: { price: true },
    });

    // 5. 直近のレシート取得 (既存ロジック維持)
    const latestReceipt = await prisma.receipt.findFirst({
      where: { memberId: mId, date: { gte: startOfMonth, lte: endOfMonth }, imagePath: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, imagePath: true, storeName: true, totalAmount: true,
        items: {
          select: { id: true, name: true, price: true, categoryId: true, category: { select: { name: true, color: true } } }
        }
      }
    });

    // 6. カテゴリマスタとマージして整形
    const categories = await prisma.category.findMany();
    const formattedStats = stats.map(s => {
      const category = categories.find(c => c.id === s.categoryId);
      return {
        categoryId: s.categoryId,
        categoryName: category ? category.name : '未分類',
        totalAmount: s._sum.price || 0,
        color: (category as any)?.color || '#999',
      };
    });

    // 7. 合計値と差分の計算
    const currentTotal = formattedStats.reduce((sum, s) => sum + s.totalAmount, 0);
    const prevTotal = prevMonthTotal._sum.price || 0;

    res.json({
      month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
      totalAmount: currentTotal,
      prevTotal: prevTotal,
      diffAmount: currentTotal - prevTotal,
      diffPercentage: prevTotal !== 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0,
      stats: formattedStats,
      latestReceipt: latestReceipt 
    });
  } catch (error: any) {
    logger.error(`[APIエラー] 集計失敗: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch monthly stats' });
  }
});

app.patch('/api/receipt-items/:id', async (req, res) => {
  const { id } = req.params;
  const { categoryId } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentItem = await tx.item.findUnique({ where: { id: Number(id) }, include: { receipt: true } });
      if (!currentItem) throw new Error('Item not found');
      const updatedItem = await tx.item.update({
        where: { id: Number(id) },
        data: { categoryId: Number(categoryId) },
        include: { category: true, receipt: true }
      });
      const cleanItemName = getCleanText(currentItem.name);
      const cleanStoreName = getCleanText(currentItem.receipt?.storeName || "");
      await tx.productMaster.upsert({
        where: { name_storeName: { name: cleanItemName, storeName: cleanStoreName } },
        update: { categoryId: Number(categoryId) },
        create: { name: cleanItemName, storeName: cleanStoreName, categoryId: Number(categoryId) }
      });
      return updatedItem;
    });
    logger.info(`[学習成功] "${result.name}" をマスタ登録完了`);
    res.json(result);
  } catch (error: any) {
    logger.error(`[APIエラー] カテゴリー修正失敗: ${error.message}`);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.listen(Number(port), host, () => {
  logger.info(`🚀 API Server running on http://${host}:${port}`);
});