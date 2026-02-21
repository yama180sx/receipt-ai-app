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
const prisma = new PrismaClient(); // PrismaClientのインスタンス化（既存になければ）

// CORS設定（Expoからのアクセスを許可）
app.use(cors({
  origin: '*', // 開発環境なので全許可
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], // PATCHを明示的に許可
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/api', receiptRoutes);

// アップロード先ディレクトリの確保
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multerの設定（メモリ保存ではなく、一旦uploadsフォルダに保存）
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
 * レシートアップロード & 解析エンドポイント
 */
app.post('/api/receipts/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '画像がアップロードされていません。' });
    }

    const memberId = parseInt(req.body.memberId) || 1; // デフォルトは管理者(1)
    const imagePath = req.file.path;

    logger.info(`[API] 受信: ${imagePath}, memberId: ${memberId}`);

    // Issue #8 で完成させたロジックを呼び出す
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
 * レシート内項目のカテゴリー修正
 */
app.patch('/api/receipt-items/:id', async (req, res) => {
  const { id } = req.params;
  const { categoryId } = req.body;

  try {
    // prisma.receiptItem ではなく prisma.item を使用
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

app.listen(port, () => {
  logger.info(`🚀 API Server running on http://localhost:${port}`);
});