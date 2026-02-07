import type { Request, Response, NextFunction } from 'express';
import { AppError, isAppError, ValidationError } from '../lib/errors.js';
import { ZodError } from 'zod';

/**
 * Central error handler middleware.
 * Converts AppError instances and Zod errors to proper HTTP responses.
 * Includes request ID for debugging/tracing.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.requestId;

  // Handle our custom AppError types
  if (isAppError(err)) {
    const response: Record<string, unknown> = {
      error: err.message,
      code: err.code,
      requestId,
    };

    // Include validation errors if present
    if (err instanceof ValidationError && err.errors) {
      response.errors = err.errors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(e.message);
    });

    res.status(422).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      requestId,
      errors,
    });
    return;
  }

  // Log unexpected errors with request ID
  console.error(`[${requestId}] Unhandled error:`, err);

  // Don't leak error details in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  res.status(500).json({
    error: message,
    code: 'INTERNAL_ERROR',
    requestId,
  });
}
