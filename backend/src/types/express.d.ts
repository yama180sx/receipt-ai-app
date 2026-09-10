import type { JWTPayload } from '../utils/auth';
import type { TenantContext } from '../utils/context';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JWTPayload;
    /**
     * テナント判定済みのサーバー内コンテキスト。
     * Multer など AsyncLocalStorage のスコープを引き継がないミドルウェアの後で復元するために使用する。
     */
    tenantContext?: TenantContext;
  }
}
