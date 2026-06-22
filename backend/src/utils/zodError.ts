import { ZodError } from 'zod';
import { AppError } from './appError';

export function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'unknown',
    message: issue.message,
  }));
}

export function zodErrorToAppError(error: ZodError): AppError {
  return new AppError('入力内容に不備があります', 400, formatZodIssues(error));
}
