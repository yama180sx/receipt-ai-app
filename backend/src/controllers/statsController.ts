import { Request, Response, NextFunction } from 'express';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import {
  createSettlementTransfer,
  deleteSettlementTransfer as removeSettlementTransfer,
  getSettlementStatusData,
} from '../services/settlement/settlementService';

export const getSettlementStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = requireTenantContext();
    const data = await getSettlementStatusData(ctx, req.query.month as string | undefined);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const addSettlementTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = requireTenantContext();
    const { month, fromMemberId, toMemberId, amount } = req.body;
    const newTransfer = await createSettlementTransfer(ctx, {
      month,
      fromMemberId,
      toMemberId,
      amount,
    });
    res.status(201).json({ success: true, data: newTransfer });
  } catch (error) {
    next(error);
  }
};

export const deleteSettlementTransfer = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const ctx = requireTenantContext();
    const data = await removeSettlementTransfer(ctx, Number(getRouteParam(req, 'id')));
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
