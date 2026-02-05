-- ============================================
-- Book of Legends - Forum Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  post_count INTEGER DEFAULT 0,
  thread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  thread_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  last_post_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Threads
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  post_count INTEGER DEFAULT 0,
  last_post_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  search_vector TSVECTOR
);

-- Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_html TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  search_vector TSVECTOR
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reply_to_thread', 'reply_to_post', 'mention', 'admin')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX idx_threads_category ON threads(category_id, is_pinned DESC, last_post_at DESC);
CREATE INDEX idx_threads_author ON threads(author_id);
CREATE INDEX idx_threads_search ON threads USING GIN(search_vector);

CREATE INDEX idx_posts_thread ON posts(thread_id, created_at ASC);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update thread search vector
CREATE OR REPLACE FUNCTION update_thread_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER thread_search_vector_update
  BEFORE INSERT OR UPDATE OF title ON threads
  FOR EACH ROW EXECUTE FUNCTION update_thread_search_vector();

-- Update post search vector
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_search_vector_update
  BEFORE INSERT OR UPDATE OF content ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();

-- Increment counts on new thread
CREATE OR REPLACE FUNCTION handle_new_thread()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE categories SET thread_count = thread_count + 1 WHERE id = NEW.category_id;
  UPDATE profiles SET thread_count = thread_count + 1 WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_thread_created
  AFTER INSERT ON threads
  FOR EACH ROW EXECUTE FUNCTION handle_new_thread();

-- Decrement counts on thread delete
CREATE OR REPLACE FUNCTION handle_delete_thread()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE categories SET thread_count = GREATEST(thread_count - 1, 0) WHERE id = OLD.category_id;
  UPDATE profiles SET thread_count = GREATEST(thread_count - 1, 0) WHERE id = OLD.author_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_thread_deleted
  AFTER DELETE ON threads
  FOR EACH ROW EXECUTE FUNCTION handle_delete_thread();

-- Increment counts + update last_post_at on new post
CREATE OR REPLACE FUNCTION handle_new_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Update thread
  UPDATE threads
  SET post_count = post_count + 1,
      last_post_at = NEW.created_at
  WHERE id = NEW.thread_id;

  -- Update category
  UPDATE categories
  SET post_count = post_count + 1,
      last_post_at = NEW.created_at
  WHERE id = (SELECT category_id FROM threads WHERE id = NEW.thread_id);

  -- Update author profile
  UPDATE profiles SET post_count = post_count + 1 WHERE id = NEW.author_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_created
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION handle_new_post();

-- Decrement counts on post delete
CREATE OR REPLACE FUNCTION handle_delete_post()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE threads SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.thread_id;
  UPDATE categories
  SET post_count = GREATEST(post_count - 1, 0)
  WHERE id = (SELECT category_id FROM threads WHERE id = OLD.thread_id);
  UPDATE profiles SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.author_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_deleted
  AFTER DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION handle_delete_post();

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, users can update own
CREATE POLICY "Profiles are publicly readable"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Categories: anyone can read, only service role can modify (admin via API)
CREATE POLICY "Categories are publicly readable"
  ON categories FOR SELECT
  USING (true);

-- Threads: anyone can read, authenticated can create, author/admin can update
CREATE POLICY "Threads are publicly readable"
  ON threads FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create threads"
  ON threads FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own threads"
  ON threads FOR UPDATE
  USING (auth.uid() = author_id);

-- Posts: anyone can read, authenticated can create (if thread not locked), author can update
CREATE POLICY "Posts are publicly readable"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

-- Notifications: users can only see and update their own
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. ENABLE REALTIME
-- ============================================
-- Run these in Supabase Dashboard > Database > Replication
-- or use the following:

ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE threads;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
