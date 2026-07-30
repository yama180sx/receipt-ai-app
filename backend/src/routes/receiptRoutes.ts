import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { validate } from '../middleware/validate';
import { deactivateProductClassificationLearningDataSchema, productClassificationCorrectionSchema, uploadReceiptSchema } from '../schemas/receiptSchema';

import {
  getReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  getLatestReceipt,
  updateItemCategory,
  updateItemProductClassification,
  getItemProductClassificationCandidates,
  getProductClassificationReviewItems,
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
import {
  deactivateProductClassificationLearningData,
  getProductClassificationLearningData,
} from '../controllers/productClassificationController';

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

router.get('/product-classification/review-items', getProductClassificationReviewItems);
router.get('/product-classification/learning-data', getProductClassificationLearningData);
router.patch('/product-classification/learning-data/:type/:id/deactivate', validate(deactivateProductClassificationLearningDataSchema), deactivateProductClassificationLearningData);

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
router.patch(
  '/receipts/items/:itemId/product-classification',
  validate(productClassificationCorrectionSchema),
  updateItemProductClassification
);
router.get('/receipts/items/:itemId/product-classification-candidates', getItemProductClassificationCandidates);
router.post('/receipts/items/:itemId/splits', updateItemSplits);
router.post('/receipts/commit', commitReceipt);

export default router;
