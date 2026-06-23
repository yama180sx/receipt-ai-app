import axios from 'axios';
import { OpenApiHttpError } from '../api/openapiHttpError';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getApiErrorMessage,
  getApiErrorResponseData,
  getApiErrorStatus,
  showApiErrorAlert,
} from './apiError';
import { showAlert } from './alertMessage';

vi.mock('./alertMessage', () => ({
  showAlert: vi.fn(),
}));

describe('apiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('extracts error field from OpenApiHttpError', () => {
    const error = new OpenApiHttpError(new Response(null, { status: 403 }), {
      error: '権限がありません',
    });

    expect(getApiErrorStatus(error)).toBe(403);
    expect(getApiErrorResponseData(error)).toEqual({ error: '権限がありません' });
    expect(getApiErrorMessage(error)).toBe('権限がありません');
  });

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

  it('showApiErrorAlert notifies user with extracted message', () => {
    const error = new axios.AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 500,
        data: { error: 'サーバーエラー' },
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as never,
      }
    );

    showApiErrorAlert('エラー', error, '操作に失敗しました。');

    expect(showAlert).toHaveBeenCalledWith('エラー', 'サーバーエラー');
    expect(console.error).toHaveBeenCalled();
  });

  it('showApiErrorAlert uses fallback when message is unavailable', () => {
    showApiErrorAlert('エラー', 'unknown', '一覧の取得に失敗しました。');

    expect(showAlert).toHaveBeenCalledWith('エラー', '一覧の取得に失敗しました。');
  });
});
