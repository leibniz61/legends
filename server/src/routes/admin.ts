import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
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

export default router;
