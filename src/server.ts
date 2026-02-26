import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { processAndSaveReceipt } from './services/receiptService';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';
import receiptRoutes from './routes/receiptRoutes';

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

// 1. CORS設定
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 2. 【Issue #15】静的ファイル配信設定
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', receiptRoutes);

// アップロード先ディレクトリの確保
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

/**
 * 【新規追加】カテゴリー一覧取得API
 * 支出の有無に関わらず、マスター登録されている全てのカテゴリーを返します。
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
 * レシートアップロード & 解析
 */
app.post('/api/receipts/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '画像がアップロードされていません。' });
    }
    const memberId = parseInt(req.body.memberId as string) || 1;
    const imagePath = req.file.path;

    logger.info(`[API] 受信: ${imagePath}, memberId: ${memberId}`);
    const result = await processAndSaveReceipt(memberId, imagePath);

    res.status(200).json({
      message: '解析および保存が完了しました。',
      data: result
    });
  } catch (error: any) {
    logger.error(`[APIエラー] ${error.message}`);
    res.status(500).json({ error: 'サーバー内部エラーが発生しました。' });
  }
});

/**
 * カテゴリー一覧取得（UI選択用）
 */
app.patch('/api/items/:id/category', async (req, res) => {
  const { id } = req.params;
  const { categoryId } = req.body;

  try {
    const updatedItem = await prisma.item.update({
      where: { id: Number(id) },
      data: { 
        categoryId: categoryId ? Number(categoryId) : null 
      },
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
 * 【Issue #14/15/16】月別カテゴリー別集計API
 */
app.get('/api/stats/monthly', async (req, res) => {
  const { month } = req.query; 
  try {
    const targetDate = month ? new Date(`${month as string}-01T00:00:00Z`) : new Date();
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

    const stats = await prisma.item.groupBy({
      by: ['categoryId'],
      where: {
        receipt: { date: { gte: startOfMonth, lte: endOfMonth } },
      },
      _sum: { price: true },
    });

    const latestReceipt = await prisma.receipt.findFirst({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        imagePath: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        imagePath: true,
        storeName: true,
        totalAmount: true,
        items: {
          select: {
            id: true,
            name: true,
            price: true,
            categoryId: true,
            category: {
              select: {
                name: true,
                color: true
              }
            }
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
        color: category ? category.color : '#999',
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
 * レシート内項目のカテゴリー修正
 */
app.patch('/api/receipt-items/:id', async (req, res) => {
  const { id } = req.params;
  const { categoryId } = req.body;

  try {
    const updatedItem = await prisma.item.update({
      where: { id: Number(id) },
      data: { categoryId: Number(categoryId) },
      include: { category: true } 
    });

    logger.info(`[API] カテゴリー修正成功: ItemID ${id} -> CategoryID ${categoryId}`);
    res.json(updatedItem);
  } catch (error: any) {
    logger.error(`[APIエラー] カテゴリー修正失敗: ${error.message}`);
    res.status(500).json({ error: 'Failed to update receipt item' });
  }
});

app.listen(Number(port), '0.0.0.0', () => {
  logger.info(`🚀 API Server running on http://0.0.0.0:${port}`);
});