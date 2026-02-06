import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { categoryCreateSchema, categoryUpdateSchema } from '../validators/schemas.js';
import { supabaseAdmin } from '../config/supabase.js';
import type { Category, CategoryWithChildren } from '@bookoflegends/shared';

const router = Router();

// GET /api/categories - returns nested structure
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    // Build nested structure: parent categories with children array
    const categories = data as Category[];
    const parentCategories = categories.filter(c => c.parent_id === null);
    const childCategories = categories.filter(c => c.parent_id !== null);

    const nested: CategoryWithChildren[] = parentCategories.map(parent => ({
      ...parent,
      children: childCategories
        .filter(child => child.parent_id === parent.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));

    res.json({ categories: nested });
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:slug - includes parent for breadcrumbs
router.get('/:slug', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*, parent:parent_id(id, name, slug)')
      .eq('slug', req.params.slug)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json({ category: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories (admin) - with parent_id validation
router.post('/', requireAuth, requireAdmin, validate(categoryCreateSchema), async (req, res, next) => {
  try {
    const { parent_id, ...rest } = req.body;

    // If parent_id provided, validate it exists and is a top-level category
    if (parent_id) {
      const { data: parent, error: parentError } = await supabaseAdmin
        .from('categories')
        .select('id, parent_id')
        .eq('id', parent_id)
        .single();

      if (parentError || !parent) {
        res.status(400).json({ error: 'Parent category not found' });
        return;
      }

      if (parent.parent_id !== null) {
        res.status(400).json({ error: 'Cannot create subcategory under another subcategory (max 2 levels)' });
        return;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({ ...rest, parent_id: parent_id || null })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ category: data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id (admin) - with parent_id validation
router.put('/:id', requireAuth, requireAdmin, validate(categoryUpdateSchema), async (req, res, next) => {
  try {
    const { parent_id, ...rest } = req.body;

    // If changing parent_id, validate
    if (parent_id !== undefined) {
      // Check if this category has children (cannot make it a subcategory)
      const { data: children } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('parent_id', req.params.id)
        .limit(1);

      if (children && children.length > 0) {
        res.status(400).json({ error: 'Cannot set parent on a category that has subcategories' });
        return;
      }

      // If setting a parent, validate it's top-level
      if (parent_id !== null) {
        const { data: parent } = await supabaseAdmin
          .from('categories')
          .select('id, parent_id')
          .eq('id', parent_id)
          .single();

        if (!parent) {
          res.status(400).json({ error: 'Parent category not found' });
          return;
        }

        if (parent.parent_id !== null) {
          res.status(400).json({ error: 'Cannot nest under a subcategory' });
          return;
        }

        // Prevent self-reference
        if (parent_id === req.params.id) {
          res.status(400).json({ error: 'Category cannot be its own parent' });
          return;
        }
      }
    }

    const updateData = parent_id !== undefined ? { ...rest, parent_id } : rest;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ category: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id (admin) - cascade handles children
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('categories')
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
