import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { reportUpdateSchema } from '../validators/schemas.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

// All admin routes require auth + admin
router.use(requireAuth, requireAdmin);

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const { data, count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    res.json({ users: data || [], total: count || 0, page });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/ban
router.put('/users/:id/ban', async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Prevent self-ban
    if (userId === req.user!.id) {
      res.status(400).json({ error: 'Cannot ban yourself' });
      return;
    }

    // Ban via Supabase auth (disables login)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: req.body.unban ? 'none' : '876000h', // ~100 years or unban
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ user: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports - List reports (paginated, filterable by status)
router.get('/reports', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const status = (req.query.status as string) || 'pending';
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data, count } = await supabaseAdmin
      .from('content_reports')
      .select(
        `
        *,
        post:posts(id, content, content_html, thread_id, author:profiles(id, username, display_name, avatar_url)),
        reporter:profiles!reporter_id(id, username, display_name, avatar_url),
        reviewer:profiles!reviewed_by(id, username, display_name)
      `,
        { count: 'exact' }
      )
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    res.json({ reports: data || [], total: count || 0, page });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports/stats - Get pending report count
router.get('/reports/stats', async (req, res, next) => {
  try {
    const { count } = await supabaseAdmin
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    res.json({ pending_count: count || 0 });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/reports/:id - Update report status
router.put('/reports/:id', validate(reportUpdateSchema), async (req, res, next) => {
  try {
    const { status, resolution_notes } = req.body;

    const { data, error } = await supabaseAdmin
      .from('content_reports')
      .update({
        status,
        resolution_notes,
        reviewed_by: req.user!.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ report: data });
  } catch (err) {
    next(err);
  }
});

export default router;
