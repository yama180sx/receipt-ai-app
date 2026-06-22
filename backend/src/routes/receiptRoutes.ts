import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { validate } from '../middleware/validate';
import { uploadReceiptSchema } from '../schemas/receiptSchema';

import {
  getReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  getLatestReceipt,
  updateItemCategory,
  getMonthlyStats,
  getJobStatus,
  getReceiptJobs,
  discardReceiptJob,
  getAdvancedStats,
  commitReceipt,
  getFamilyMembers,
  updateItemSplits,
  uploadReceipt,
} from '../controllers/receiptController';
import { serveReceiptImage } from '../controllers/uploadController';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  '/receipts/upload',
  upload.single('image'),
  authMiddleware,
  tenantMiddleware,
  validate(uploadReceiptSchema),
  uploadReceipt
);

router.use(authMiddleware, tenantMiddleware);

router.get('/family-groups/members', getFamilyMembers);
router.get('/uploads/:filename', serveReceiptImage);

router.get('/receipts', getReceipts);
router.get('/receipts/jobs', getReceiptJobs);
router.delete('/receipts/jobs/:jobId', discardReceiptJob);
router.get('/receipts/latest', getLatestReceipt);
router.get('/receipts/status/:jobId', getJobStatus);
router.get('/stats/monthly', getMonthlyStats);
router.get('/stats/advanced', getAdvancedStats);
router.post('/receipts', createReceipt);
router.delete('/receipts/:id', deleteReceipt);
router.patch('/receipts/:id', updateReceipt);
router.patch('/receipts/items/:id', updateItemCategory);
router.post('/receipts/items/:itemId/splits', updateItemSplits);
router.post('/receipts/commit', commitReceipt);

export default router;
