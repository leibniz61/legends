import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * In-memory cache to debounce last_seen_at updates.
 * Maps user ID to last update timestamp.
 */
const lastSeenCache = new Map<string, number>();

// Update at most once per minute per user
const DEBOUNCE_MS = 60 * 1000;

/**
 * Middleware to update user's last_seen_at timestamp.
 * Runs on every request but debounces database updates.
 */
export async function updateLastSeen(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  // Get user ID from token (lightweight check)
  try {
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(token);

    if (user?.id) {
      const now = Date.now();
      const lastUpdate = lastSeenCache.get(user.id) || 0;

      // Only update if enough time has passed
      if (now - lastUpdate > DEBOUNCE_MS) {
        lastSeenCache.set(user.id, now);

        // Fire-and-forget update (wrapped in Promise.resolve for proper catch handling)
        void supabaseAdmin
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    }
  } catch {
    // Ignore errors - this is non-critical
  }

  next();
}
