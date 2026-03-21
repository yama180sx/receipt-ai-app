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
app.use('/api', receiptRoutes);

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * カテゴリー一覧取得API
 */
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    logger.error(`[APIエラー] カテゴリー取得失敗: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * レシートアップロード & 解析 (Issue #18: 回転補正強化版 / Issue #22: 重複検知対応)
 */
app.post('/api/receipts/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '画像がアップロードされていません。' });
    }

    const memberId = parseInt(req.body.memberId as string) || 1;
    const fileName = `receipt-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    const imagePath = path.join(uploadDir, fileName);

    // --- Sharpによる画像最適化 ---
    await sharp(req.file.buffer, { failOnError: false })
      .rotate() 
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toFile(imagePath);

    logger.info(`[Issue #18] 画像最適化・回転補正完了: ${imagePath}`);

    // 解析および保存処理
    const result = await processAndSaveReceipt(memberId, imagePath);

    const data = {
      id: result.id,
      memberId: result.memberId,
      storeName: result.storeName,
      date: result.date,
      totalAmount: result.totalAmount,
      imagePath: result.imagePath,
      items: result.items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        categoryId: i.categoryId,
        category: i.category ? { id: i.category.id, name: i.category.name, color: (i.category as any).color } : null
      })),
    };

    res.status(200).json({
      message: '解析および保存が完了しました。',
      data
    });
    
  } catch (error: any) {
    // --- 【Issue #22】Service層からの重複エラーをキャッチ ---
    if (error.message === 'DUPLICATE_RECEIPT_DETECTED') {
      logger.warn(`[API] 重複登録を検知したため409を返却: memberId=${req.body.memberId}`);
      return res.status(409).json({ 
        error: 'このレシートは既に登録されています。',
        code: 'DUPLICATE_RECEIPT' 
      });
    }

    // それ以外の予期せぬエラー
    logger.error(`[APIエラー] ${error.message}`);
    res.status(500).json({ error: 'サーバー内部エラーが発生しました。' });
  }
});

/**
 * カテゴリー一覧修正（UI選択用）
 */
app.patch('/api/items/:id/category', async (req, res) => {
  const { id } = req.params;
  const { categoryId } = req.body;
  try {
    const updatedItem = await prisma.item.update({
      where: { id: Number(id) },
      data: { categoryId: categoryId ? Number(categoryId) : null },
      include: { category: true } 
    });
    logger.info(`[API] カテゴリー修正成功: ItemID ${id} -> Category ${updatedItem.category?.name || '未分類'}`);
    res.json(updatedItem);
  } catch (error: any) {
    logger.error(`[APIエラー] カテゴリー修正失敗: ${error.message}`);
    res.status(500).json({ error: 'Failed to update item category' });
  }
});

/**
 * 月別カテゴリー別集計API
 */
app.get('/api/stats/monthly', async (req, res) => {
  const { month } = req.query; 
  try {
    const targetDate = month ? new Date(`${month as string}-01T00:00:00Z`) : new Date();
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

    const stats = await prisma.item.groupBy({
      by: ['categoryId'],
      where: { receipt: { date: { gte: startOfMonth, lte: endOfMonth } } },
      _sum: { price: true },
    });

    const latestReceipt = await prisma.receipt.findFirst({
      where: { date: { gte: startOfMonth, lte: endOfMonth }, imagePath: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, imagePath: true, storeName: true, totalAmount: true,
        items: {
          select: {
            id: true, name: true, price: true, categoryId: true,
            category: { select: { name: true, color: true } }
          }
        }
      }
    });

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

    res.json({
      month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
      stats: formattedStats,
      latestReceipt: latestReceipt 
    });
  } catch (error: any) {
    logger.error(`[APIエラー] 集計失敗: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch monthly stats' });
  }
});

/**
 * 【Issue #13】レシート内項目のカテゴリー修正 & 学習機能
 */
app.patch('/api/receipt-items/:id', async (req, res) => {
  const { id } = req.params;
  const { categoryId } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentItem = await tx.item.findUnique({
        where: { id: Number(id) },
        include: { receipt: true }
      });
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
    logger.info(`[学習成功] "${result.name}" を正規化キー "${getCleanText(result.name)}" でマスタ登録完了`);
    res.json(result);
  } catch (error: any) {
    logger.error(`[APIエラー] カテゴリー修正/学習失敗: ${error.message}`);
    res.status(500).json({ error: 'Failed to update item and learn category' });
  }
});

app.listen(Number(port), host, () => {
  logger.info(`🚀 API Server running on http://${host}:${port}`);
});