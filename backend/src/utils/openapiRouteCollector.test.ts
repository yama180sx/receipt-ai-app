import { describe, expect, it } from 'vitest';
import { collectOpenApiRoutes, defaultOpenApiFilePath } from './openapiRouteCollector';
import { toRouteKeySet } from './apiRouteEndpoint';

describe('openapiRouteCollector', () => {
  it('loads public API paths from openapi.yaml', () => {
    const routes = collectOpenApiRoutes(defaultOpenApiFilePath());
    const keys = toRouteKeySet(routes);

    expect(keys.has('GET /health')).toBe(true);
    expect(keys.has('POST /api/auth/login')).toBe(true);
    expect(keys.has('GET /api/receipts')).toBe(true);
    expect(keys.has('POST /api/receipts/upload')).toBe(true);
    expect(routes.length).toBeGreaterThan(30);
  });
});
