import fs from 'fs';
import path from 'path';
import type { ApiRouteEndpoint } from './apiRouteEndpoint';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

function openApiPathToExpress(apiPath: string): string {
  if (apiPath === '/health') return '/health';
  return `/api${apiPath}`;
}

/** docs/openapi/openapi.yaml の paths から公開エンドポイントを抽出する */
export function collectOpenApiRoutes(openApiFilePath: string): ApiRouteEndpoint[] {
  const absolutePath = path.resolve(openApiFilePath);
  const doc = fs.readFileSync(absolutePath, 'utf8');

  const pathsStart = doc.indexOf('\npaths:\n');
  if (pathsStart < 0) {
    throw new Error('OpenAPI document is missing paths: section');
  }

  const componentsStart = doc.indexOf('\ncomponents:\n', pathsStart);
  const pathsSection =
    componentsStart > -1 ? doc.slice(pathsStart, componentsStart) : doc.slice(pathsStart);

  const endpoints: ApiRouteEndpoint[] = [];
  let currentApiPath: string | null = null;

  for (const line of pathsSection.split('\n')) {
    const pathMatch = line.match(/^  (\/[\w\-/{}]+):\s*$/);
    if (pathMatch) {
      currentApiPath = pathMatch[1];
      continue;
    }

    const methodMatch = line.match(/^    (get|post|put|patch|delete):\s*$/);
    if (methodMatch && currentApiPath) {
      endpoints.push({
        method: methodMatch[1].toUpperCase(),
        path: openApiPathToExpress(currentApiPath),
      });
    }
  }

  return endpoints.sort(
    (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method)
  );
}

export function defaultOpenApiFilePath(): string {
  return path.resolve(__dirname, '../../../docs/openapi/openapi.yaml');
}
