import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { threadCreateSchema, threadUpdateSchema } from '../validators/schemas.js';
import { supabaseAdmin } from '../config/supabase.js';
import { canModify } from '../lib/authorization.js';
import {
  getThreadWithPosts,
  getCategoryThreads,
  createThread,
} from '../services/threads.js';

const router = Router();

// GET /api/categories/:slug/threads
router.get('/categories/:slug/threads', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;

    // Extract user ID from token if present (for read status)
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(
          authHeader.split(' ')[1]
        );
        userId = user?.id;
      } catch {
        // Ignore auth errors for public viewing
      }
    }

    const result = await getCategoryThreads({
      categorySlug: req.params.slug as string,
      page,
      userId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/threads/:id
router.get('/threads/:id', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;

    // Extract user ID from token if present
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(
          authHeader.split(' ')[1]
        );
        userId = user?.id;
      } catch {
        // Ignore auth errors for public viewing
      }
    }

    const result = await getThreadWithPosts({
      threadId: req.params.id,
      page,
      userId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/categories/:slug/threads
router.post(
  '/categories/:slug/threads',
  requireAuth,
  validate(threadCreateSchema),
  async (req, res, next) => {
    try {
      const thread = await createThread({
        categorySlug: req.params.slug as string,
        title: req.body.title,
        content: req.body.content,
        author: req.user!,
      });
      res.status(201).json({ thread });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/threads/:id
router.put(
  '/threads/:id',
  requireAuth,
  validate(threadUpdateSchema),
  async (req, res, next) => {
    try {
      const { data: thread } = await supabaseAdmin
        .from('threads')
        .select('author_id')
        .eq('id', req.params.id)
        .single();

      if (!thread) {
        res.status(404).json({ error: 'Thread not found' });
        return;
      }

      if (!canModify(thread, req.user!)) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('threads')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.json({ thread: data });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/threads/:id (admin)
router.delete('/threads/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('threads')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PUT /api/threads/:id/pin (admin)
router.put('/threads/:id/pin', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data: thread } = await supabaseAdmin
      .from('threads')
      .select('is_pinned')
      .eq('id', req.params.id)
      .single();

    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('threads')
      .update({ is_pinned: !thread.is_pinned })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ thread: data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/threads/:id/lock (admin)
router.put('/threads/:id/lock', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data: thread } = await supabaseAdmin
      .from('threads')
      .select('is_locked')
      .eq('id', req.params.id)
      .single();

    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('threads')
      .update({ is_locked: !thread.is_locked })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ thread: data });
  } catch (err) {
    next(err);
  }
});

export default router;
