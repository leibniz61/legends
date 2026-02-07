import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { postCreateSchema, postUpdateSchema, reactionSchema } from '../validators/schemas.js';
import { supabaseAdmin } from '../config/supabase.js';
import { renderMarkdown } from '../lib/markdown.js';
import { canModify } from '../lib/authorization.js';
import { notifyOnNewPost } from '../services/notifications.js';

const router = Router();

// POST /api/threads/:id/posts
router.post('/threads/:id/posts', requireAuth, validate(postCreateSchema), async (req, res, next) => {
  try {
    const { content } = req.body;

    // Check thread exists and isn't locked
    const { data: thread } = await supabaseAdmin
      .from('threads')
      .select('id, title, is_locked, author_id')
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

    // Send notifications asynchronously (don't await to speed up response)
    notifyOnNewPost(
      { id: post.id, content },
      { id: thread.id, title: thread.title, author_id: thread.author_id },
      req.user!
    ).catch((err) => console.error('Notification error:', err));

    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
});

// PUT /api/posts/:id
router.put('/posts/:id', requireAuth, validate(postUpdateSchema), async (req, res, next) => {
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

    if (!canModify(post, req.user!)) {
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

// DELETE /api/posts/:id (author or admin)
router.delete('/posts/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('author_id, thread_id')
      .eq('id', req.params.id)
      .single();

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (!canModify(post, req.user!)) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Check if this is the first post in the thread (can't delete - must delete thread instead)
    const { data: firstPost } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('thread_id', post.thread_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (firstPost?.id === req.params.id) {
      res.status(400).json({ error: 'Cannot delete the opening post. Delete the thread instead.' });
      return;
    }

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

// POST /api/posts/:id/reactions - Add a reaction
router.post('/posts/:id/reactions', requireAuth, validate(reactionSchema), async (req, res, next) => {
  try {
    const { reaction_type } = req.body;

    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const { data: reaction, error } = await supabaseAdmin
      .from('post_reactions')
      .upsert({
        post_id: req.params.id,
        user_id: req.user!.id,
        reaction_type,
      }, { onConflict: 'post_id,user_id,reaction_type' })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ reaction });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id/reactions - Remove a reaction
router.delete('/posts/:id/reactions', requireAuth, validate(reactionSchema), async (req, res, next) => {
  try {
    const { reaction_type } = req.body;

    const { error } = await supabaseAdmin
      .from('post_reactions')
      .delete()
      .eq('post_id', req.params.id)
      .eq('user_id', req.user!.id)
      .eq('reaction_type', reaction_type);

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
