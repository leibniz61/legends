import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { profileUpdateSchema } from '../validators/schemas.js';
import { supabaseAdmin } from '../config/supabase.js';
import { POSTS_PER_PAGE } from '@bookoflegends/shared';

const router = Router();

// GET /api/profiles/:username
router.get('/:username', async (req, res, next) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('username', req.params.username)
      .single();

    if (error || !profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profiles/me
router.put('/me', requireAuth, validate(profileUpdateSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.user!.id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ profile: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/profiles/:username/posts
router.get('/:username/posts', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * POSTS_PER_PAGE;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', req.params.username)
      .single();

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const { data: posts, count } = await supabaseAdmin
      .from('posts')
      .select('*, thread:threads(id, title, slug)', { count: 'exact' })
      .eq('author_id', profile.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + POSTS_PER_PAGE - 1);

    res.json({ posts: posts || [], total: count || 0, page });
  } catch (err) {
    next(err);
  }
});

export default router;
