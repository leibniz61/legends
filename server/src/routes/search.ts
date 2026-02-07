import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { SEARCH_RESULTS_PER_PAGE } from '@bookoflegends/shared';

const router = Router();

// GET /api/search?q=&type=threads|posts
router.get('/', async (req, res, next) => {
  try {
    const query = (req.query.q as string || '').trim();
    const type = req.query.type as string || 'threads';
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * SEARCH_RESULTS_PER_PAGE;

    if (!query) {
      res.json({ results: [], total: 0, page });
      return;
    }

    // Convert to tsquery format
    const tsquery = query.split(/\s+/).join(' & ');

    if (type === 'posts') {
      const { data, count } = await supabaseAdmin
        .from('posts')
        .select('*, author:profiles(id, username, display_name, avatar_url), thread:threads(id, title, slug)', { count: 'exact' })
        .textSearch('search_vector', tsquery)
        .order('created_at', { ascending: false })
        .range(offset, offset + SEARCH_RESULTS_PER_PAGE - 1);

      res.json({ results: data || [], total: count || 0, page, type });
    } else {
      const { data, count } = await supabaseAdmin
        .from('threads')
        .select('*, author:profiles!threads_author_id_fkey(id, username, display_name, avatar_url), category:categories(id, name, slug)', { count: 'exact' })
        .textSearch('search_vector', tsquery)
        .order('last_post_at', { ascending: false })
        .range(offset, offset + SEARCH_RESULTS_PER_PAGE - 1);

      res.json({ results: data || [], total: count || 0, page, type });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
