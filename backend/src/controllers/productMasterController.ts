import { AppError } from '../utils/appError';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import { asyncHandler } from '../utils/asyncHandler';
import { sendMessage, sendSuccess } from '../utils/sendApiResponse';
import {
  listProductMasters,
  updateProductMaster,
  mergeStoreNames,
  deleteProductMaster,
} from '../services/productMaster/productMasterService';

export const getProductMasters = asyncHandler(async (req, res) => {
  const masters = await listProductMasters(requireTenantContext(), {
    q: typeof req.query.q === 'string' ? req.query.q : undefined,
    store: typeof req.query.store === 'string' ? req.query.store : undefined,
  });
  sendSuccess(res, masters);
});

export const updateProductMasterHandler = asyncHandler(async (req, res) => {
  const updated = await updateProductMaster(
    requireTenantContext(),
    Number(getRouteParam(req, 'id')),
    req.body
  );
  sendSuccess(res, updated);
});

export { updateProductMasterHandler as updateProductMaster };

export const mergeStoreNamesHandler = asyncHandler(async (req, res) => {
  const { sourceStoreName, targetStoreName } = req.body;
  const data = await mergeStoreNames(
    requireTenantContext(),
    sourceStoreName,
    targetStoreName
  );
  sendSuccess(res, data);
});

export { mergeStoreNamesHandler as mergeStoreNames };

export const deleteProductMasterHandler = asyncHandler(async (req, res) => {
  await deleteProductMaster(requireTenantContext(), Number(getRouteParam(req, 'id')));
  sendMessage(res, '削除しました');
});

export { deleteProductMasterHandler as deleteProductMaster };
