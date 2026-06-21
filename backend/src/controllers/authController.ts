import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../utils/auth';
import {
  confirmTotpSetupForMember,
  disableTotpForMember,
  listFamilyMembersForInvite,
  loginMember,
  resolveFamilyByInviteCode,
  startTotpSetupForMember,
  verifyTotpForMember,
} from '../services/authService';
import { getRouteParam } from '../utils/routeParams';

type AuthUser = JWTPayload;

const ok = <T>(res: Response, data: T) => res.status(200).json({ success: true, data });

const getAuthUser = (req: Request): AuthUser => (req as Request & { user: AuthUser }).user;

const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      ok(res, await fn(req, res));
    } catch (error) {
      next(error);
    }
  };

export const resolveFamily = handle(async (req) => {
  const { inviteCode } = req.body;
  return resolveFamilyByInviteCode(typeof inviteCode === 'string' ? inviteCode : '');
});

export const getFamilyMembers = handle(async (req) => {
  const familyGroupId = parseInt(getRouteParam(req, 'familyGroupId'), 10);
  const inviteCode = typeof req.query.inviteCode === 'string' ? req.query.inviteCode : '';
  return listFamilyMembersForInvite(familyGroupId, inviteCode);
});

export const login = handle(async (req) => loginMember(req.body));

export const startTotpSetup = handle(async (req) => startTotpSetupForMember(getAuthUser(req).id));

export const confirmTotpSetup = handle(async (req) => {
  const user = getAuthUser(req);
  const { code } = req.body;
  return confirmTotpSetupForMember(user.id, typeof code === 'string' ? code : '', user.purpose ?? 'access');
});

export const verifyTotp = handle(async (req) => {
  const { code } = req.body;
  return verifyTotpForMember(getAuthUser(req).id, typeof code === 'string' ? code : '');
});

export const disableTotp = handle(async (req) => {
  const { password, code } = req.body;
  return disableTotpForMember(getAuthUser(req).id, String(password ?? ''), String(code ?? ''));
});
