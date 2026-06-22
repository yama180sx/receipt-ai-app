import { Request } from 'express';
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
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/sendApiResponse';
import {
  mapFamilyGroupToResolvedFamily,
  mapLoginSessionToResponse,
  mapMembersToAuthFamilyMembers,
  mapTotpConfirmAccessToApi,
  mapTotpSetupToApi,
} from '../mappers/authMapper';

type AuthUser = JWTPayload;

const getAuthUser = (req: Request): AuthUser => (req as Request & { user: AuthUser }).user;

export const resolveFamily = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  const familyGroup = await resolveFamilyByInviteCode(
    typeof inviteCode === 'string' ? inviteCode : ''
  );
  sendSuccess(res, mapFamilyGroupToResolvedFamily(familyGroup));
});

export const getFamilyMembers = asyncHandler(async (req, res) => {
  const familyGroupId = parseInt(getRouteParam(req, 'familyGroupId'), 10);
  const inviteCode = typeof req.query.inviteCode === 'string' ? req.query.inviteCode : '';
  const members = await listFamilyMembersForInvite(familyGroupId, inviteCode);
  sendSuccess(res, mapMembersToAuthFamilyMembers(members));
});

export const login = asyncHandler(async (req, res) => {
  const session = await loginMember(req.body);
  sendSuccess(res, mapLoginSessionToResponse(session));
});

export const startTotpSetup = asyncHandler(async (req, res) => {
  const setup = await startTotpSetupForMember(getAuthUser(req).id);
  sendSuccess(res, mapTotpSetupToApi(setup));
});

export const confirmTotpSetup = asyncHandler(async (req, res) => {
  const user = getAuthUser(req);
  const { code } = req.body;
  const result = await confirmTotpSetupForMember(
    user.id,
    typeof code === 'string' ? code : '',
    user.purpose ?? 'access'
  );

  if ('token' in result) {
    sendSuccess(res, mapLoginSessionToResponse(result));
    return;
  }

  sendSuccess(res, mapTotpConfirmAccessToApi(result));
});

export const verifyTotp = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const session = await verifyTotpForMember(
    getAuthUser(req).id,
    typeof code === 'string' ? code : ''
  );
  sendSuccess(res, mapLoginSessionToResponse(session));
});

export const disableTotp = asyncHandler(async (req, res) => {
  const { password, code } = req.body;
  const result = await disableTotpForMember(
    getAuthUser(req).id,
    String(password ?? ''),
    String(code ?? '')
  );
  sendSuccess(res, result);
});
