import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { UNREAD_PER_PAGE } from '@bookoflegends/shared';
import type { UnreadListResponse } from '@bookoflegends/shared';

const router = Router();

/**
 * GET /api/unread
 * Get all threads with unread posts for the current user.
 * Supports filters: all | subscribed | mine
 */
router.get('/unread', requireAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const filter = (req.query.filter as string) || 'all';
    const offset = (page - 1) * UNREAD_PER_PAGE;
    const userId = req.user!.id;

    // Build base query for threads with activity after user's last read
    let query = supabaseAdmin
      .from('threads')
      .select(
        `
        *,
        author:profiles!threads_author_id_fkey(id, username, display_name, avatar_url),
        category:categories(id, name, slug),
        thread_reads!left(last_post_number)
      `,
        { count: 'exact' }
      )
      .eq('thread_reads.user_id', userId);

    // Apply filters
    if (filter === 'subscribed') {
      // Only threads user is subscribed to
      const { data: subscriptions } = await supabaseAdmin
        .from('thread_subscriptions')
        .select('thread_id')
        .eq('user_id', userId);

      const subscribedIds = subscriptions?.map((s) => s.thread_id) || [];
      if (subscribedIds.length === 0) {
        res.json({ threads: [], total: 0, page } as UnreadListResponse);
        return;
      }
      query = query.in('id', subscribedIds);
    } else if (filter === 'mine') {
      // Only threads created by user
      query = query.eq('author_id', userId);
    }

    // Order by last activity
    query = query
      .order('last_post_at', { ascending: false })
      .range(offset, offset + UNREAD_PER_PAGE - 1);

    const { data: threads, count } = await query;

    // Filter to only unread threads and calculate unread count
    const unreadThreads = (threads || [])
      .map((thread) => {
        const readInfo = thread.thread_reads?.[0];
        const lastReadPost = readInfo?.last_post_number || 0;
        const unreadCount = Math.max(0, thread.post_count - lastReadPost);

        return {
          ...thread,
          thread_reads: undefined, // Remove the join data
          has_unread: unreadCount > 0,
          unread_count: unreadCount,
        };
      })
      .filter((thread) => thread.has_unread);

    res.json({
      threads: unreadThreads,
      total: count || 0,
      page,
    } as UnreadListResponse);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/threads/:id/read
 * Mark a thread as read up to a specific post number.
 */
router.put('/threads/:id/read', requireAuth, async (req, res, next) => {
  try {
    const threadId = req.params.id;
    const userId = req.user!.id;
    const postNumber = parseInt(req.body.post_number as string) || undefined;

    // Get current post count if not specified
    let lastPostNumber = postNumber;
    if (!lastPostNumber) {
      const { data: thread } = await supabaseAdmin
        .from('threads')
        .select('post_count')
        .eq('id', threadId)
        .single();
      lastPostNumber = thread?.post_count || 0;
    }

    // Upsert read status
    const { error } = await supabaseAdmin.from('thread_reads').upsert(
      {
        user_id: userId,
        thread_id: threadId,
        last_read_at: new Date().toISOString(),
        last_post_number: lastPostNumber,
      },
      { onConflict: 'user_id,thread_id' }
    );

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/read-all
 * Mark all threads as read for the current user.
 */
router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Get all threads with their post counts
    const { data: threads } = await supabaseAdmin
      .from('threads')
      .select('id, post_count');

    if (!threads || threads.length === 0) {
      res.json({ success: true, marked: 0 });
      return;
    }

    // Upsert read status for all threads
    const reads = threads.map((t) => ({
      user_id: userId,
      thread_id: t.id,
      last_read_at: new Date().toISOString(),
      last_post_number: t.post_count,
    }));

    const { error } = await supabaseAdmin
      .from('thread_reads')
      .upsert(reads, { onConflict: 'user_id,thread_id' });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true, marked: threads.length });
  } catch (err) {
    next(err);
  }
});

export default router;
