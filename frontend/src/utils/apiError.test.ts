import axios from 'axios';
import { describe, expect, it } from 'vitest';
import {
  getApiErrorMessage,
  getApiErrorResponseData,
  getApiErrorStatus,
} from './apiError';

describe('apiError', () => {
  it('extracts error field from axios response', () => {
    const error = new axios.AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 403,
        data: { error: '権限がありません' },
        statusText: 'Forbidden',
        headers: {},
        config: {} as never,
      }
    );

    expect(getApiErrorStatus(error)).toBe(403);
    expect(getApiErrorResponseData(error)).toEqual({ error: '権限がありません' });
    expect(getApiErrorMessage(error)).toBe('権限がありません');
  });

  it('falls back to message field then Error.message', () => {
    const axiosError = new axios.AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 409,
        data: { message: 'DUPLICATE' },
        statusText: 'Conflict',
        headers: {},
        config: {} as never,
      }
    );

    expect(getApiErrorMessage(axiosError)).toBe('DUPLICATE');
    expect(getApiErrorMessage(new Error('保存に失敗'))).toBe('保存に失敗');
    expect(getApiErrorMessage('unknown')).toBe('通信エラーが発生しました。');
  });
});
