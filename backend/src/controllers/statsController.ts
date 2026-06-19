import { Request, Response, NextFunction } from 'express';
import { getFamilyGroupId } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import {
  createSettlementTransfer,
  deleteSettlementTransfer as removeSettlementTransfer,
  getSettlementStatusData,
} from '../services/settlement/settlementService';

export const getSettlementStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getSettlementStatusData(
      getFamilyGroupId(),
      req.query.month as string | undefined
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const addSettlementTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, fromMemberId, toMemberId, amount } = req.body;
    const newTransfer = await createSettlementTransfer(getFamilyGroupId(), {
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
    const data = await removeSettlementTransfer(
      getFamilyGroupId(),
      Number(getRouteParam(req, 'id'))
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
