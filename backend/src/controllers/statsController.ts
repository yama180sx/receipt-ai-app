import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/sendApiResponse';
import {
  mapDeletedSettlementTransferToApi,
  mapSettlementStatusToApi,
  mapSettlementTransferToApi,
} from '../mappers/settlementMapper';
import {
  createSettlementTransfer,
  deleteSettlementTransfer as removeSettlementTransfer,
  getSettlementStatusData,
} from '../services/settlement/settlementService';

export const getSettlementStatus = asyncHandler(async (req, res) => {
  const ctx = requireTenantContext();
  const data = await getSettlementStatusData(ctx, req.query.month as string | undefined);
  sendSuccess(res, mapSettlementStatusToApi(data));
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
  sendSuccess(res, mapSettlementTransferToApi(newTransfer), 201);
});

export const deleteSettlementTransfer = asyncHandler(async (req, res) => {
  const ctx = requireTenantContext();
  const data = await removeSettlementTransfer(ctx, Number(getRouteParam(req, 'id')));
  sendSuccess(res, mapDeletedSettlementTransferToApi(data.id));
});
