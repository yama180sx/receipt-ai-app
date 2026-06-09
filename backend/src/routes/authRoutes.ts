import { Router } from 'express';
import {
  confirmTotpSetup,
  disableTotp,
  getFamilyMembers,
  login,
  resolveFamily,
  startTotpSetup,
  verifyTotp,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { pendingAuthMiddleware } from '../middleware/pendingAuthMiddleware';

const router = Router();

router.post('/resolve-family', resolveFamily);
router.get('/families/:familyGroupId/members', getFamilyMembers);
router.post('/login', login);

router.post(
  '/totp/setup',
  pendingAuthMiddleware('totp_setup', 'access'),
  startTotpSetup
);
router.post(
  '/totp/confirm',
  pendingAuthMiddleware('totp_setup', 'access'),
  confirmTotpSetup
);
router.post('/verify-totp', pendingAuthMiddleware('totp_pending'), verifyTotp);

router.post('/totp/disable', authMiddleware, disableTotp);

export default router;
