import { describe, expect, it } from 'vitest';
import { OpenApiHttpError, unwrapOpenApiResponse } from './openapiHttpError';

describe('OpenApiHttpError', () => {
  it('reads message from error body', () => {
    const err = new OpenApiHttpError(new Response(null, { status: 400 }), {
      message: 'カテゴリ名が不正です',
    });
    expect(err.message).toBe('カテゴリ名が不正です');
    expect(err.status).toBe(400);
  });
});

describe('unwrapOpenApiResponse', () => {
  it('returns data on success', async () => {
    const payload = { success: true as const, data: [{ id: 1, name: '食費', color: '#fff' }] };
    const result = await unwrapOpenApiResponse(
      Promise.resolve({
        data: payload,
        error: undefined,
        response: new Response(null, { status: 200 }),
      })
    );
    expect(result).toEqual(payload);
  });

  it('throws OpenApiHttpError when response is not ok', async () => {
    await expect(
      unwrapOpenApiResponse(
        Promise.resolve({
          data: undefined,
          error: { message: 'Not Found' },
          response: new Response(null, { status: 404 }),
        })
      )
    ).rejects.toBeInstanceOf(OpenApiHttpError);
  });
});
