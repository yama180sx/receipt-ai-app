import type { JWTPayload } from '../utils/auth';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JWTPayload;
  }
}
