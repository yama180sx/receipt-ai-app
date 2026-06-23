/** openapi-fetch 呼び出し失敗時の HTTP エラー（Axios 互換の message / status / data） */
export class OpenApiHttpError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(response: Response, body: unknown) {
    const message = readErrorMessage(body) ?? `HTTP ${response.status}`;
    super(message);
    this.name = 'OpenApiHttpError';
    this.status = response.status;
    this.data = body;
  }
}

function readErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as Record<string, unknown>;
  if (typeof record.message === 'string') return record.message;
  if (typeof record.error === 'string') return record.error;
  return undefined;
}

/** openapi-fetch の GET/POST 等の戻り値を envelope ごと返す。失敗時は throw */
export async function unwrapOpenApiResponse<T>(
  result: Promise<{
    data?: T;
    error?: unknown;
    response: Response;
  }>
): Promise<T> {
  const { data, error, response } = await result;
  if (!response.ok || error !== undefined) {
    throw new OpenApiHttpError(response, error ?? data);
  }
  if (data === undefined) {
    throw new OpenApiHttpError(response, { message: 'Empty response body' });
  }
  return data;
}
