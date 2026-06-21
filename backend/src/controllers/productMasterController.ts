import { Request, Response, NextFunction } from 'express';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import {
  listProductMasters,
  updateProductMaster,
  mergeStoreNames,
  deleteProductMaster,
} from '../services/productMaster/productMasterService';

export const getProductMasters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const masters = await listProductMasters(requireTenantContext(), {
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      store: typeof req.query.store === 'string' ? req.query.store : undefined,
    });
    res.json({ success: true, data: masters });
  } catch (error) {
    next(error);
  }
};

export const updateProductMasterHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const updated = await updateProductMaster(
      requireTenantContext(),
      Number(getRouteParam(req, 'id')),
      req.body
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export { updateProductMasterHandler as updateProductMaster };

export const mergeStoreNamesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sourceStoreName, targetStoreName } = req.body;
    const data = await mergeStoreNames(
      requireTenantContext(),
      sourceStoreName,
      targetStoreName
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export { mergeStoreNamesHandler as mergeStoreNames };

export const deleteProductMasterHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await deleteProductMaster(requireTenantContext(), Number(getRouteParam(req, 'id')));
    res.json({ success: true, message: '削除しました' });
  } catch (error) {
    next(error);
  }
};

export { deleteProductMasterHandler as deleteProductMaster };
