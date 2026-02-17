import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { processAndSaveReceipt } from './services/receiptService';
import logger from './utils/logger';

const app = express();
const port = process.env.PORT || 3000;

// CORS設定（Expoからのアクセスを許可）
app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
  logger.info(`🚀 API Server running on http://localhost:${port}`);
});