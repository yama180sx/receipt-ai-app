import type { Request } from 'express';

/** Express 5 の req.params 値（string | string[]）を単一 string に正規化 */
export function getRouteParam(req: Request, key: string): string {
  const value = req.params[key];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}
