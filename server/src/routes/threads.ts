import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { threadCreateSchema, threadUpdateSchema } from '../validators/schemas.js';
import { supabaseAdmin } from '../config/supabase.js';
import { renderMarkdown } from '../lib/markdown.js';
import { THREADS_PER_PAGE, POSTS_PER_PAGE } from '@bookoflegends/shared';

const router = Router();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

// GET /api/categories/:slug/threads
router.get('/categories/:slug/threads', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * THREADS_PER_PAGE;

    // Get category
    const { data: category } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', req.params.slug)
      .single();

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const { data: threads, count } = await supabaseAdmin
      .from('threads')
      .select('*, author:profiles(id, username, display_name, avatar_url)', { count: 'exact' })
      .eq('category_id', category.id)
      .order('is_pinned', { ascending: false })
      .order('last_post_at', { ascending: false })
      .range(offset, offset + THREADS_PER_PAGE - 1);

    res.json({ threads: threads || [], total: count || 0, page });
  } catch (err) {
    next(err);
  }
});

// GET /api/threads/:id
router.get('/threads/:id', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * POSTS_PER_PAGE;

    const { data: thread } = await supabaseAdmin
      .from('threads')
      .select('*, author:profiles(id, username, display_name, avatar_url), category:categories(id, name, slug, parent:parent_id(id, name, slug))')
      .eq('id', req.params.id)
      .single();

    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    const { data: posts, count } = await supabaseAdmin
      .from('posts')
      .select('*, author:profiles(id, username, display_name, avatar_url, role)', { count: 'exact' })
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + POSTS_PER_PAGE - 1);

    // If user is authenticated, get their reactions for these posts
    let userReactions: Record<string, { id: string; reaction_type: string }> = {};
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ') && posts?.length) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.split(' ')[1]);
        if (user) {
          const { data: reactions } = await supabaseAdmin
            .from('post_reactions')
            .select('id, post_id, reaction_type')
            .eq('user_id', user.id)
            .in('post_id', posts.map(p => p.id));

          reactions?.forEach(r => {
            userReactions[r.post_id] = { id: r.id, reaction_type: r.reaction_type };
          });
        }
      } catch {
        // Ignore auth errors for public viewing
      }
    }

    // Attach user reactions to posts
    const postsWithReactions = posts?.map(post => ({
      ...post,
      user_reaction: userReactions[post.id] || null,
    }));

    res.json({ thread, posts: postsWithReactions || [], total: count || 0, page });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories/:slug/threads
router.post('/categories/:slug/threads', requireAuth, validate(threadCreateSchema), async (req, res, next) => {
  try {
    const { title, content } = req.body;

    const { data: category } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', req.params.slug)
      .single();

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const slug = slugify(title);
    const content_html = renderMarkdown(content);

    // Create thread
    const { data: thread, error: threadError } = await supabaseAdmin
      .from('threads')
      .insert({
        category_id: category.id,
        author_id: req.user!.id,
        title,
        slug,
      })
      .select()
      .single();

    if (threadError || !thread) {
      res.status(400).json({ error: threadError?.message || 'Failed to create thread' });
      return;
    }

    // Create first post
    const { error: postError } = await supabaseAdmin
      .from('posts')
      .insert({
        thread_id: thread.id,
        author_id: req.user!.id,
        content,
        content_html,
      });

    if (postError) {
      // Rollback thread creation
      await supabaseAdmin.from('threads').delete().eq('id', thread.id);
      res.status(400).json({ error: postError.message });
      return;
    }

    res.status(201).json({ thread });
  } catch (err) {
    next(err);
  }
});

// PUT /api/threads/:id
router.put('/threads/:id', requireAuth, validate(threadUpdateSchema), async (req, res, next) => {
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

    if (thread.author_id !== req.user!.id && req.user!.role !== 'admin') {
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
});

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
