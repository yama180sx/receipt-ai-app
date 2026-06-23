import createClient from 'openapi-fetch';
import type { Middleware } from 'openapi-fetch';
import type { paths } from './generated/schema';
import { buildAuthHeaders } from '../utils/apiAuth';
import { showAlert } from '../utils/alertMessage';
import { notifyUnauthorized } from '../utils/apiClient';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;
if (!API_BASE) {
  console.warn('[OpenAPI] Warning: EXPO_PUBLIC_API_URL is not defined. Falling back to localhost.');
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const headers = await buildAuthHeaders();
    for (const [key, value] of Object.entries(headers)) {
      request.headers.set(key, value);
    }
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401) {
      console.warn('[OpenAPI] Unauthorized');
      notifyUnauthorized();
    } else if (response.status === 403) {
      console.warn('[OpenAPI] Forbidden');
      showAlert('アクセス権限エラー', 'この操作を行う権限がありません。');
    }
    return response;
  },
};

/** OpenAPI paths 型付き HTTP クライアント（#105-5 PoC） */
export const openapiClient = createClient<paths>({
  baseUrl: API_BASE || 'http://localhost:3000/api',
});

openapiClient.use(authMiddleware);

export type { OpenApiHttpError } from './openapiHttpError';
