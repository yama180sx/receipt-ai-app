import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { AppError } from './appError';

const CURSOR_VERSION = 1;
const CURSOR_PURPOSE = 'receipt-pagination-cursor:v1';

export type ReceiptPaginationFilters = {
  month?: string;
  memberId?: number;
  query?: string;
};

export type ReceiptCursorPosition = {
  date: Date;
  id: number;
};

type CursorPayload = {
  v: number;
  d: number;
  i: number;
  f: string;
};

function getSigningKey(): Buffer {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError('CursorSigningUnavailable', 500);
  }

  return createHmac('sha256', jwtSecret).update(CURSOR_PURPOSE).digest();
}

function getFilterFingerprint(filters: ReceiptPaginationFilters): string {
  return createHash('sha256')
    .update(JSON.stringify({
      month: filters.month ?? null,
      memberId: filters.memberId ?? null,
      query: filters.query ?? null,
    }))
    .digest('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', getSigningKey()).update(payload).digest('base64url');
}

function invalidCursor(): never {
  throw new AppError('InvalidCursor', 400);
}

export function encodeReceiptCursor(
  position: ReceiptCursorPosition,
  filters: ReceiptPaginationFilters
): string {
  const payload: CursorPayload = {
    v: CURSOR_VERSION,
    d: position.date.getTime(),
    i: position.id,
    f: getFilterFingerprint(filters),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function decodeReceiptCursor(
  cursor: string,
  filters: ReceiptPaginationFilters
): ReceiptCursorPosition {
  const [encodedPayload, receivedSignature, ...extraParts] = cursor.split('.');
  if (!encodedPayload || !receivedSignature || extraParts.length > 0) invalidCursor();

  const expectedSignature = sign(encodedPayload);
  const receivedBuffer = Buffer.from(receivedSignature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    invalidCursor();
  }

  let payload: CursorPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as CursorPayload;
  } catch {
    return invalidCursor();
  }

  const date = new Date(payload.d);
  if (
    payload.v !== CURSOR_VERSION ||
    !Number.isSafeInteger(payload.d) ||
    Number.isNaN(date.getTime()) ||
    !Number.isSafeInteger(payload.i) ||
    payload.i < 1 ||
    typeof payload.f !== 'string' ||
    payload.f !== getFilterFingerprint(filters)
  ) {
    invalidCursor();
  }

  return { date, id: payload.i };
}
