import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reportCreateSchema } from '../validators/schemas.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

// POST /api/posts/:id/report - Create a report for a post
router.post('/posts/:id/report', requireAuth, validate(reportCreateSchema), async (req, res, next) => {
  try {
    const { reason, details } = req.body;

    // Verify post exists
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('id, author_id')
      .eq('id', req.params.id)
      .single();

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Can't report own posts
    if (post.author_id === req.user!.id) {
      res.status(400).json({ error: 'Cannot report your own content' });
      return;
    }

    // Upsert to handle duplicate reports (update if already exists)
    const { data: report, error } = await supabaseAdmin
      .from('content_reports')
      .upsert(
        {
          post_id: req.params.id,
          reporter_id: req.user!.id,
          reason,
          details,
          status: 'pending',
        },
        { onConflict: 'post_id,reporter_id' }
      )
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
});

export default router;
