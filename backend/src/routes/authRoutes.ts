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
import {
  authLoginRateLimit,
  authMembersRateLimit,
  authResolveRateLimit,
  authTotpRateLimit,
} from '../middleware/rateLimitMiddleware';

const router = Router();

router.post('/resolve-family', authResolveRateLimit, resolveFamily);
router.get('/families/:familyGroupId/members', authMembersRateLimit, getFamilyMembers);
router.post('/login', authLoginRateLimit, login);

router.post(
  '/totp/setup',
  pendingAuthMiddleware('totp_setup', 'access'),
  authTotpRateLimit,
  startTotpSetup
);
router.post(
  '/totp/confirm',
  pendingAuthMiddleware('totp_setup', 'access'),
  authTotpRateLimit,
  confirmTotpSetup
);
router.post('/verify-totp', pendingAuthMiddleware('totp_pending'), authTotpRateLimit, verifyTotp);

router.post('/totp/disable', authMiddleware, authTotpRateLimit, disableTotp);

export default router;
