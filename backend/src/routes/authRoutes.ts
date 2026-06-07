import { Router } from 'express';
import { getFamilyMembers, login, resolveFamily } from '../controllers/authController';

const router = Router();

// [Issue #93-2] Step 1: 招待コード → 世帯特定
router.post('/resolve-family', resolveFamily);

// [Issue #93-2] Step 2: 世帯メンバー一覧（?inviteCode= 必須）
router.get('/families/:familyGroupId/members', getFamilyMembers);

// [Issue #93-2] Step 4: ログイン
router.post('/login', login);

export default router;
