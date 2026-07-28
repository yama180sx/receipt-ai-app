import express from 'express';
import { getProductTypes } from '../controllers/productTypeController';

const router = express.Router();

router.get('/', getProductTypes);

export default router;
