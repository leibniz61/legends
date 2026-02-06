-- ============================================
-- Category Hierarchy Migration
-- Adds parent/subcategory support (max 2 levels)
-- ============================================

-- Add parent_id column (nullable = top-level category)
ALTER TABLE categories ADD COLUMN parent_id UUID REFERENCES categories(id) ON DELETE CASCADE;

-- Index for efficient parent-child queries
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ============================================
-- Trigger: Enforce 2-level max depth
-- ============================================

CREATE OR REPLACE FUNCTION check_category_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Check if the parent already has a parent (would make this level 3+)
    IF EXISTS (SELECT 1 FROM categories WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Categories cannot be nested more than 2 levels deep';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_category_depth
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION check_category_depth();

-- ============================================
-- Trigger: Prevent parent from becoming subcategory if it has children
-- ============================================

CREATE OR REPLACE FUNCTION check_parent_has_no_children()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND OLD.parent_id IS NULL THEN
    -- Trying to set parent_id on a category that was top-level
    IF EXISTS (SELECT 1 FROM categories WHERE parent_id = NEW.id) THEN
      RAISE EXCEPTION 'Cannot set parent_id on a category that has subcategories';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_nested_parent
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION check_parent_has_no_children();

-- ============================================
-- Update thread triggers to bubble counts to parent
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_thread()
RETURNS TRIGGER AS $$
DECLARE
  parent_category_id UUID;
BEGIN
  -- Update the direct category
  UPDATE categories SET thread_count = thread_count + 1 WHERE id = NEW.category_id;

  -- Also update parent category if exists
  SELECT parent_id INTO parent_category_id FROM categories WHERE id = NEW.category_id;
  IF parent_category_id IS NOT NULL THEN
    UPDATE categories SET thread_count = thread_count + 1 WHERE id = parent_category_id;
  END IF;

  UPDATE profiles SET thread_count = thread_count + 1 WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_delete_thread()
RETURNS TRIGGER AS $$
DECLARE
  parent_category_id UUID;
BEGIN
  UPDATE categories SET thread_count = GREATEST(thread_count - 1, 0) WHERE id = OLD.category_id;

  SELECT parent_id INTO parent_category_id FROM categories WHERE id = OLD.category_id;
  IF parent_category_id IS NOT NULL THEN
    UPDATE categories SET thread_count = GREATEST(thread_count - 1, 0) WHERE id = parent_category_id;
  END IF;

  UPDATE profiles SET thread_count = GREATEST(thread_count - 1, 0) WHERE id = OLD.author_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Update post triggers to bubble counts to parent
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_post()
RETURNS TRIGGER AS $$
DECLARE
  cat_id UUID;
  parent_cat_id UUID;
BEGIN
  UPDATE threads
  SET post_count = post_count + 1,
      last_post_at = NEW.created_at
  WHERE id = NEW.thread_id;

  SELECT category_id INTO cat_id FROM threads WHERE id = NEW.thread_id;

  UPDATE categories
  SET post_count = post_count + 1,
      last_post_at = NEW.created_at
  WHERE id = cat_id;

  -- Also update parent category
  SELECT parent_id INTO parent_cat_id FROM categories WHERE id = cat_id;
  IF parent_cat_id IS NOT NULL THEN
    UPDATE categories
    SET post_count = post_count + 1,
        last_post_at = GREATEST(COALESCE(last_post_at, '1970-01-01'::timestamptz), NEW.created_at)
    WHERE id = parent_cat_id;
  END IF;

  UPDATE profiles SET post_count = post_count + 1 WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_delete_post()
RETURNS TRIGGER AS $$
DECLARE
  cat_id UUID;
  parent_cat_id UUID;
BEGIN
  UPDATE threads SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.thread_id;

  SELECT category_id INTO cat_id FROM threads WHERE id = OLD.thread_id;

  UPDATE categories SET post_count = GREATEST(post_count - 1, 0) WHERE id = cat_id;

  SELECT parent_id INTO parent_cat_id FROM categories WHERE id = cat_id;
  IF parent_cat_id IS NOT NULL THEN
    UPDATE categories SET post_count = GREATEST(post_count - 1, 0) WHERE id = parent_cat_id;
  END IF;

  UPDATE profiles SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.author_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
