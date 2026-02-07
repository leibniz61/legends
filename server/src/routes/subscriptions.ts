import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { SUBSCRIPTIONS_PER_PAGE } from '@bookoflegends/shared';

const router = Router();

// POST /api/threads/:id/subscribe - Subscribe to a thread
router.post('/threads/:id/subscribe', requireAuth, async (req, res, next) => {
  try {
    // Verify thread exists
    const { data: thread } = await supabaseAdmin
      .from('threads')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    // Upsert subscription (ignore if already exists)
    const { data: subscription, error } = await supabaseAdmin
      .from('thread_subscriptions')
      .upsert(
        {
          thread_id: req.params.id,
          user_id: req.user!.id,
        },
        { onConflict: 'thread_id,user_id' }
      )
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ subscription });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/threads/:id/subscribe - Unsubscribe from a thread
router.delete('/threads/:id/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('thread_subscriptions')
      .delete()
      .eq('thread_id', req.params.id)
      .eq('user_id', req.user!.id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/subscriptions - Get user's watched threads
router.get('/subscriptions', requireAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * SUBSCRIPTIONS_PER_PAGE;

    const { data: subscriptions, count } = await supabaseAdmin
      .from('thread_subscriptions')
      .select(
        `
        id,
        created_at,
        thread:threads(
          id,
          title,
          slug,
          post_count,
          last_post_at,
          is_locked,
          author:profiles!threads_author_id_fkey(id, username, display_name, avatar_url),
          category:categories(id, name, slug)
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + SUBSCRIPTIONS_PER_PAGE - 1);

    res.json({
      subscriptions: subscriptions || [],
      total: count || 0,
      page,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
