import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Extend Express Request to include requestId.
 */
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Middleware that generates a unique request ID for each incoming request.
 * The ID is attached to req.requestId and sent in the X-Request-Id response header.
 *
 * If the client sends an X-Request-Id header, it will be used instead of generating a new one.
 * This enables request tracing across services.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
