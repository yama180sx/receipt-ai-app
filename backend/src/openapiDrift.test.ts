import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import {
  diffRouteSets,
  toRouteKeySet,
} from './utils/apiRouteEndpoint';
import { collectExpressRoutes } from './utils/expressRouteCollector';
import {
  collectOpenApiRoutes,
  defaultOpenApiFilePath,
} from './utils/openapiRouteCollector';

vi.mock('./queues/receiptQueue', () => ({
  RECEIPT_QUEUE_NAME: 'receipt-analysis',
  receiptQueue: {
    add: vi.fn(),
  },
}));

describe('OpenAPI drift', () => {
  let expressKeys: Set<string>;
  let openApiKeys: Set<string>;

  beforeAll(() => {
    const openApiRoutes = collectOpenApiRoutes(defaultOpenApiFilePath());
    openApiKeys = toRouteKeySet(openApiRoutes);

    const app = createApp();
    const probePaths = openApiRoutes.map((route) => route.path);
    expressKeys = toRouteKeySet(
      collectExpressRoutes(app, { mountProbePaths: probePaths })
    );
  });

  it('implements every path documented in OpenAPI', () => {
    const { missingInActual, extraInActual } = diffRouteSets(expressKeys, openApiKeys);

    expect(
      missingInActual,
      `Express is missing OpenAPI endpoints:\n${missingInActual.join('\n')}`
    ).toEqual([]);
    expect(
      extraInActual,
      `Express has undocumented endpoints:\n${extraInActual.join('\n')}`
    ).toEqual([]);
  });
});
