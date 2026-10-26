import { describe, expect, it, vi } from 'vitest';
import apiClient from '../utils/apiClient';
import { categoryApi } from './categoryApi';

vi.mock('../utils/apiClient', () => ({
  default: { get: vi.fn() },
}));

describe('categoryApi', () => {
  it('returns the API success envelope from the shared Axios client', async () => {
    const payload = { success: true as const, data: [{ id: 1, name: '食費', color: '#fff', keywords: [], isAdjustment: false }] };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: payload } as never);

    await expect(categoryApi.listCategories()).resolves.toEqual(payload);
    expect(apiClient.get).toHaveBeenCalledWith('/categories');
  });
});
