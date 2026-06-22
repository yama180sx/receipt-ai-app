export type ApiRouteEndpoint = {
  method: string;
  path: string;
};

/** Express `:id` / OpenAPI `{itemId}` を同一視する正規化キー */
export function normalizeRouteKey(method: string, path: string): string {
  const normalizedPath = path
    .replace(/:([A-Za-z0-9_]+)/g, '{}')
    .replace(/\{[A-Za-z0-9_]+\}/g, '{}')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '') || '/';

  return `${method.toUpperCase()} ${normalizedPath}`;
}

export function toRouteKeySet(endpoints: ApiRouteEndpoint[]): Set<string> {
  return new Set(endpoints.map((e) => normalizeRouteKey(e.method, e.path)));
}

export function diffRouteSets(
  actual: Set<string>,
  expected: Set<string>
): { missingInActual: string[]; extraInActual: string[] } {
  const missingInActual = [...expected].filter((key) => !actual.has(key)).sort();
  const extraInActual = [...actual].filter((key) => !expected.has(key)).sort();
  return { missingInActual, extraInActual };
}
