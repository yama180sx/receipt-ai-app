import type { Application, Router } from 'express';
import type { ApiRouteEndpoint } from './apiRouteEndpoint';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
  name?: string;
  handle?: Router;
  match?: (path: string) => boolean;
  path?: string;
};

const DEFAULT_MOUNT_PROBE_PATHS = [
  '/health',
  '/api/auth/resolve-family',
  '/api/auth/families/1/members',
  '/api/admin/stats',
  '/api/admin/prompts',
  '/api/categories',
  '/api/product-master',
  '/api/stats/settlement',
  '/api/receipts',
  '/api/receipts/upload',
  '/api/family-groups/members',
  '/api/uploads/sample.webp',
];

function joinPaths(prefix: string, segment: string): string {
  if (!segment || segment === '/') {
    return prefix || '/';
  }
  const combined = `${prefix}${segment.startsWith('/') ? segment : `/${segment}`}`;
  return combined.replace(/\/+/g, '/') || '/';
}

function resolveMountPrefix(
  layer: RouterLayer,
  prefix: string,
  probePaths: string[]
): string {
  if (typeof layer.match !== 'function') return '';

  let longest = '';
  for (const fullProbe of probePaths) {
    const relativeProbe =
      prefix && fullProbe.startsWith(prefix)
        ? fullProbe.slice(prefix.length) || '/'
        : fullProbe;

    layer.path = undefined;
    if (layer.match(relativeProbe) && layer.path) {
      if (layer.path.length > longest.length) {
        longest = layer.path;
      }
    }
  }
  return longest;
}

function collectFromRouter(
  router: Router,
  prefix: string,
  probePaths: string[]
): ApiRouteEndpoint[] {
  const stack = (router as unknown as { stack?: RouterLayer[] }).stack ?? [];
  const endpoints: ApiRouteEndpoint[] = [];

  for (const layer of stack) {
    if (layer.route) {
      const fullPath = joinPaths(prefix, layer.route.path);
      for (const [method, enabled] of Object.entries(layer.route.methods)) {
        if (!enabled || method === '_all') continue;
        endpoints.push({ method: method.toUpperCase(), path: fullPath });
      }
      continue;
    }

    if (layer.name === 'router' && layer.handle) {
      const mountSegment = resolveMountPrefix(layer, prefix, probePaths);
      if (!mountSegment && mountSegment !== '') continue;
      const nextPrefix = joinPaths(prefix, mountSegment);
      endpoints.push(...collectFromRouter(layer.handle, nextPrefix, probePaths));
    }
  }

  return endpoints;
}

export type CollectExpressRoutesOptions = {
  mountProbePaths?: string[];
};

/** createApp() で登録された HTTP ルート一覧を収集する */
export function collectExpressRoutes(
  app: Application,
  options?: CollectExpressRoutesOptions
): ApiRouteEndpoint[] {
  const probePaths = options?.mountProbePaths ?? DEFAULT_MOUNT_PROBE_PATHS;
  const router = (app as unknown as { router?: Router }).router;
  if (!router) return [];

  const endpoints = collectFromRouter(router, '', probePaths);
  const seen = new Set<string>();
  const unique: ApiRouteEndpoint[] = [];

  for (const endpoint of endpoints) {
    const key = `${endpoint.method} ${endpoint.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(endpoint);
  }

  return unique.sort(
    (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method)
  );
}
