import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { postCreateSchema, postUpdateSchema } from '../validators/schemas.js';
import { supabaseAdmin } from '../config/supabase.js';
import { renderMarkdown } from '../lib/markdown.js';

const router = Router();

// POST /api/threads/:id/posts
router.post('/threads/:id/posts', requireAuth, validate(postCreateSchema), async (req, res, next) => {
  try {
    const { content } = req.body;

    // Check thread exists and isn't locked
    const { data: thread } = await supabaseAdmin
      .from('threads')
      .select('id, is_locked, author_id')
      .eq('id', req.params.id)
      .single();

    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    if (thread.is_locked) {
      res.status(403).json({ error: 'Thread is locked' });
      return;
    }

    const content_html = renderMarkdown(content);

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert({
        thread_id: thread.id,
        author_id: req.user!.id,
        content,
        content_html,
      })
      .select('*, author:profiles(id, username, display_name, avatar_url, role)')
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Create notification for thread author (if not self-replying)
    if (thread.author_id !== req.user!.id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: thread.author_id,
        type: 'reply_to_thread',
        title: `${req.user!.username} replied to your thread`,
        link: `/threads/${thread.id}`,
      });
    }

    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
});

// PUT /api/posts/:id
router.put('/:id', requireAuth, validate(postUpdateSchema), async (req, res, next) => {
  try {
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('author_id')
      .eq('id', req.params.id)
      .single();

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (post.author_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const content_html = renderMarkdown(req.body.content);

    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({
        content: req.body.content,
        content_html,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ post: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('posts')
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

export default router;
