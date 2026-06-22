import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formatZodIssues, zodErrorToAppError } from './zodError';

describe('zodError', () => {
  it('converts ZodError to AppError with field details', () => {
    const schema = z.object({ memberId: z.number() });
    const parsed = schema.safeParse({ memberId: 'x' });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const appError = zodErrorToAppError(parsed.error);
    expect(appError.statusCode).toBe(400);
    expect(appError.message).toBe('入力内容に不備があります');
    expect(formatZodIssues(parsed.error)[0].field).toBe('memberId');
  });
});
