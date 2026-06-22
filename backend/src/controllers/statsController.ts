import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/sendApiResponse';
import {
  createSettlementTransfer,
  deleteSettlementTransfer as removeSettlementTransfer,
  getSettlementStatusData,
} from '../services/settlement/settlementService';

export const getSettlementStatus = asyncHandler(async (req, res) => {
  const ctx = requireTenantContext();
  const data = await getSettlementStatusData(ctx, req.query.month as string | undefined);
  sendSuccess(res, data);
});

export const addSettlementTransfer = asyncHandler(async (req, res) => {
  const ctx = requireTenantContext();
  const { month, fromMemberId, toMemberId, amount } = req.body;
  const newTransfer = await createSettlementTransfer(ctx, {
    month,
    fromMemberId,
    toMemberId,
    amount,
  });
  sendSuccess(res, newTransfer, 201);
});

export const deleteSettlementTransfer = asyncHandler(async (req, res) => {
  const ctx = requireTenantContext();
  const data = await removeSettlementTransfer(ctx, Number(getRouteParam(req, 'id')));
  sendSuccess(res, data);
});
