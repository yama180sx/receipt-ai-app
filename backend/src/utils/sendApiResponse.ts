import type { Response } from 'express';
import type { ApiMessageResponse, ApiSuccessResponse } from '../types/apiResponse';

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const body: ApiSuccessResponse<T> = { success: true, data };
  res.status(status).json(body);
}

export function sendMessage(res: Response, message: string, status = 200): void {
  const body: ApiMessageResponse = { success: true, message };
  res.status(status).json(body);
}

export function sendOk(res: Response, status = 200): void {
  res.status(status).json({ success: true });
}
